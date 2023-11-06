#include "sokol_app.h"
#include "sokol_gfx.h"
#include "sokol_glue.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "stb_image.h"

#include "sokol_imgui.h"

// Must be separate to avoid reordering.
#include "sokol_debugtext.h"

#include <hermes/VM/static_h.h>
#include <hermes/hermes.h>

#include <vector>

static sg_sampler s_sampler = {};

struct InternalImage {
  const char unsigned *data;
  unsigned size;
  const char *name;
};

#define IMPORT_IMAGE(name)                           \
  extern "C" const unsigned char img_##name##_png[]; \
  extern "C" const unsigned img_##name##_png_size;   \
  static InternalImage s_img_##name = {img_##name##_png, img_##name##_png_size, #name}

IMPORT_IMAGE(ship);
IMPORT_IMAGE(enemy);
IMPORT_IMAGE(background);

std::array<InternalImage *, 3> s_internalImages = {&s_img_ship, &s_img_enemy, &s_img_background};

class Image {
 public:
  int w_ = 0, h_ = 0;
  sg_image image_ = {};
  simgui_image_t simguiImage_ = {};

  explicit Image(const char *path) {
    const unsigned char *buf = nullptr;
    unsigned size = 0;

    for (auto img : s_internalImages) {
      if (strcmp(img->name, path) == 0) {
        buf = img->data;
        size = img->size;
        break;
      }
    }

    unsigned char *data;
    int n;
    if (buf) {
      data = stbi_load_from_memory(buf, size, &w_, &h_, &n, 4);
    } else {
      data = stbi_load(path, &w_, &h_, &n, 4);
    }

    if (!data) {
      slog_func("ERROR", 1, 0, "Failed to load image", __LINE__, __FILE__, nullptr);
      abort();
    }

    image_ = sg_make_image(sg_image_desc{
        .width = w_,
        .height = h_,
        .data{.subimage[0][0] = {.ptr = data, .size = (size_t)w_ * h_ * 4}},
    });

    stbi_image_free(data);
    simguiImage_ = simgui_make_image(simgui_image_desc_t{image_, s_sampler});
  }

  ~Image() {
    simgui_destroy_image(simguiImage_);
    sg_destroy_image(image_);
  }
};

static std::vector<std::unique_ptr<Image>> s_images{};

static SHRuntime *s_shRuntime = nullptr;
static facebook::hermes::HermesRuntime *s_hermes = nullptr;

static bool s_started = false;
static uint64_t s_start_time = 0;
static uint64_t s_last_fps_time = 0;
static double s_fps = 0;

extern "C" int load_image(const char *path) {
  s_images.emplace_back(std::make_unique<Image>(path));
  return s_images.size() - 1;
}
extern "C" int image_width(int index) {
  if (index < 0 || index >= s_images.size()) {
    slog_func("ERROR", 1, 0, "Invalid image index", __LINE__, __FILE__, nullptr);
    return 0;
  }
  return s_images[index]->w_;
}
extern "C" int image_height(int index) {
  if (index < 0 || index >= s_images.size()) {
    slog_func("ERROR", 1, 0, "Invalid image index", __LINE__, __FILE__, nullptr);
    return 0;
  }
  return s_images[index]->h_;
}
extern "C" const simgui_image_t *image_simgui_image(int index) {
  if (index < 0 || index >= s_images.size()) {
    slog_func("ERROR", 1, 0, "Invalid image index", __LINE__, __FILE__, nullptr);
    return 0;
  }
  return &s_images[index]->simguiImage_;
}

static void app_init() {
  stm_setup();

  sg_desc desc = {.context = sapp_sgcontext(), .logger.func = slog_func};
  sg_setup(&desc);
  simgui_setup(simgui_desc_t{});

  s_sampler = sg_make_sampler(sg_sampler_desc{
      .min_filter = SG_FILTER_LINEAR,
      .mag_filter = SG_FILTER_LINEAR,
  });

  sdtx_desc_t sdtx_desc = {.fonts = {sdtx_font_kc854()}, .logger.func = slog_func};
  sdtx_setup(&sdtx_desc);

  try {
    s_hermes->global().getPropertyAsFunction(*s_hermes, "on_init").call(*s_hermes);
  } catch (facebook::jsi::JSIException &e) {
    slog_func("ERROR", 1, 0, e.what(), __LINE__, __FILE__, nullptr);
    abort();
  }
}

static void app_cleanup() {
  s_images.clear();
  simgui_shutdown();
  sdtx_shutdown();
  sg_shutdown();

  if (s_shRuntime) {
    _sh_done(s_shRuntime);
    s_shRuntime = nullptr;
  }
}

static void app_event(const sapp_event *ev) {
  if (ev->type == SAPP_EVENTTYPE_KEY_DOWN && ev->key_code == SAPP_KEYCODE_Q &&
      (ev->modifiers & SAPP_MODIFIER_SUPER)) {
    sapp_request_quit();
    return;
  }

  try {
    s_hermes->global()
        .getPropertyAsFunction(*s_hermes, "on_event")
        .call(*s_hermes, (double)ev->type, (double)ev->key_code, (double)ev->modifiers);
  } catch (facebook::jsi::JSIException &e) {
    slog_func("ERROR", 1, 0, e.what(), __LINE__, __FILE__, nullptr);
  }

  if (simgui_handle_event(ev))
    return;
}

static float s_bg_color[4] = {0.0f, 0.0f, 0.0f, 0.0f};
extern "C" float *get_bg_color() {
  return s_bg_color;
}

static void app_frame() {
  uint64_t now = stm_now();

  if (!s_started) {
    s_started = true;
    s_start_time = now;
    s_last_fps_time = now;
  } else {
    // Update FPS every second
    uint64_t diff = stm_diff(now, s_last_fps_time);
    if (diff > 1000000000) {
      s_fps = 1.0 / sapp_frame_duration(); // stm_sec(diff);
      s_last_fps_time = now;
    }
  }

  simgui_new_frame({
      .width = sapp_width(),
      .height = sapp_height(),
      .delta_time = sapp_frame_duration(),
      .dpi_scale = sapp_dpi_scale(),
  });

  // Setup pass action to clear the framebuffer with yellow color
  sg_pass_action pass_action = {
      .colors[0] = {
          .load_action = SG_LOADACTION_CLEAR,
          .clear_value = {s_bg_color[0], s_bg_color[1], s_bg_color[2], s_bg_color[3]}}};

  // Begin and end pass
  sg_begin_default_pass(&pass_action, sapp_width(), sapp_height());

  try {
    s_hermes->global()
        .getPropertyAsFunction(*s_hermes, "on_frame")
        .call(*s_hermes, sapp_widthf(), sapp_heightf(), stm_sec(stm_diff(now, s_start_time)));
  } catch (facebook::jsi::JSIException &e) {
    slog_func("ERROR", 1, 0, e.what(), __LINE__, __FILE__, nullptr);
  }

  simgui_render();
  sdtx_canvas((float)sapp_width(), (float)sapp_height());
  sdtx_printf("FPS: %d", (int)(s_fps + 0.5));
  sdtx_draw();
  sg_end_pass();
  sg_commit();
}

static sapp_desc s_app_desc{};
extern "C" void scroller_run(SHRuntime *shr, int width, int height) {
  s_hermes = _sh_get_hermes_runtime(shr);
  s_shRuntime = shr;

  sapp_desc desc = {};
  desc.init_cb = app_init;
  desc.frame_cb = app_frame;
  desc.cleanup_cb = app_cleanup;
  desc.event_cb = app_event;
  desc.width = width;
  desc.height = height;
  desc.window_title = "Static Hermes UI";
  desc.logger.func = slog_func;

  s_app_desc = desc;
}

extern "C" SHUnit sh_export_demo;

sapp_desc sokol_main(int argc, char* argv[]) {
  SHRuntime *shr = _sh_init(argc, argv);
  if (!_sh_initialize_units(shr, 1, &sh_export_demo))
    abort();

  return s_app_desc;
}
