#include "sokol_app.h"
#include "sokol_gfx.h"
#include "sokol_glue.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "stb_image.h"

// Must be separate to avoid reordering.
#include "sokol_debugtext.h"

#include "shaders.h"

#include <hermes/VM/static_h.h>
#include <hermes/hermes.h>

#include <deque>
#include <vector>

class Image {
 public:
  int w_ = 0, h_ = 0;
  sg_image image_ = {};

  explicit Image(const char *path) {
    int n;
    unsigned char *data = stbi_load(path, &w_, &h_, &n, 4);
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
  }

  ~Image() {
    sg_destroy_image(image_);
  }
};

static const float ASSUMED_W = 800;
static const float INV_ASSUMED_W = 1.0f / ASSUMED_W;
static const float ASSUMED_H = 600;
static const float INV_ASSUMED_H = 1.0f / ASSUMED_H;

static int s_frame_count = 0;
static double s_fps = 0;
static uint64_t s_last_fps_time;

static sg_shader s_fill_sh = {};
static sg_pipeline s_fill_pip = {};

static sg_shader s_blit_sh = {};
static sg_pipeline s_blit_pip = {};
static sg_sampler s_sampler = {};

static std::vector<std::unique_ptr<Image>> s_images{};

/// Map from an image id to an index in s_img_list.
static std::map<uint32_t, unsigned> s_img_index{};
/// List of vertices in the vertex pool associated with an image.
static std::vector<std::pair<sg_image, std::vector<float> *>> s_img_list{};
/// Lists of triangle vertices. {x, y, u, v}
static std::deque<std::vector<float>> s_vert_pool{};

/// List of fill triangle vertices. {x, y, r, g, b, a};
static std::vector<float> s_fill_verts{};

static facebook::hermes::HermesRuntime *s_hermes = nullptr;

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

static void reset_prims() {
  for (auto &verts : s_vert_pool)
    verts.clear();
  s_fill_verts.clear();
}

static void push_rect(std::vector<float> &vec, float x, float y, float w, float h) {
  /*
   * Triangle strip:
   *    2  |  0
   * ------+------
   *    3  |  1
   */
  vec.insert(vec.end(), {x + w, y + h, 1, 1});
  vec.insert(vec.end(), {x + w, y, 1, 0});
  vec.insert(vec.end(), {x, y + h, 0, 1});

  vec.insert(vec.end(), {x + w, y, 1, 0});
  vec.insert(vec.end(), {x, y + h, 0, 1});
  vec.insert(vec.end(), {x, y, 0, 0});
}

static void
push_rect_with_color(std::vector<float> &vec, float x, float y, float w, float h, sg_color color) {
  /*
   * Triangle strip:
   *    2  |  0
   * ------+------
   *    3  |  1
   */
  vec.insert(vec.end(), {x + w, y + h});
  vec.insert(vec.end(), {color.r, color.g, color.b, color.a});
  vec.insert(vec.end(), {x + w, y});
  vec.insert(vec.end(), {color.r, color.g, color.b, color.a});
  vec.insert(vec.end(), {x, y + h});
  vec.insert(vec.end(), {color.r, color.g, color.b, color.a});

  vec.insert(vec.end(), {x + w, y});
  vec.insert(vec.end(), {color.r, color.g, color.b, color.a});
  vec.insert(vec.end(), {x, y + h});
  vec.insert(vec.end(), {color.r, color.g, color.b, color.a});
  vec.insert(vec.end(), {x, y});
  vec.insert(vec.end(), {color.r, color.g, color.b, color.a});
}

extern "C" void draw_blit_px(int imageIndex, float x, float y, float w, float h) {
  if (imageIndex < 0 || imageIndex >= s_images.size()) {
    slog_func("ERROR", 1, 0, "Invalid image index", __LINE__, __FILE__, nullptr);
    return;
  }
  Image *image = s_images[imageIndex].get();

  // If this is a new image, add it to the image list and create a new vertex list.
  auto [it, inserted] = s_img_index.try_emplace(image->image_.id, 0);
  if (inserted) {
    s_vert_pool.emplace_back();
    s_img_list.emplace_back(image->image_, &s_vert_pool.back());
    it->second = s_img_list.size() - 1;
  }

  //-1, 1       1, 1
  //
  //       0,0
  //
  //-1,-1       1, -1
  x = x * INV_ASSUMED_W * 2 - 1;
  y = -(y * INV_ASSUMED_H * 2 - 1);
  w = w * INV_ASSUMED_W * 2;
  h = -(h * INV_ASSUMED_H * 2);

  push_rect(*s_img_list[it->second].second, x, y, w, h);
}

extern "C" void
draw_fill_px(float x, float y, float w, float h, float r, float g, float b, float a) {
  //-1, 1       1, 1
  //
  //       0,0
  //
  //-1,-1       1, -1
  x = x * INV_ASSUMED_W * 2 - 1;
  y = -(y * INV_ASSUMED_H * 2 - 1);
  w = w * INV_ASSUMED_W * 2;
  h = -(h * INV_ASSUMED_H * 2);

  push_rect_with_color(s_fill_verts, x, y, w, h, {r, g, b, a});
}

static void render_prims() {
  {
    sg_apply_pipeline(s_blit_pip);

    sg_bindings blit_bind = {};
    blit_bind.fs.samplers[SLOT_samp] = s_sampler;

    blit_vs_params_t blit_vs_params;
    for (int y = 0; y < 4; ++y)
      for (int x = 0; x < 4; ++x)
        blit_vs_params.transform[y * 4 + x] = x == y ? 1 : 0;

    sg_apply_uniforms(SG_SHADERSTAGE_VS, SLOT_blit_vs_params, SG_RANGE(blit_vs_params));

    for (auto &img : s_img_list) {
      if (img.second->empty())
        continue;
      blit_bind.fs.images[SLOT_tex] = img.first;
      blit_bind.vertex_buffers[0] = sg_make_buffer(sg_buffer_desc{
          .data = {.ptr = img.second->data(), .size = img.second->size() * sizeof(float)},
          .label = "blit vertices",
      });
      sg_apply_bindings(&blit_bind);
      sg_draw(0, img.second->size() / 4, 1);
      sg_destroy_buffer(blit_bind.vertex_buffers[0]);
    }
  }

  if (!s_fill_verts.empty()) {
    sg_apply_pipeline(s_fill_pip);

    fill_vs_params_t fill_vs_params;
    for (int y = 0; y < 4; ++y)
      for (int x = 0; x < 4; ++x)
        fill_vs_params.transform[y * 4 + x] = x == y ? 1 : 0;

    sg_apply_uniforms(SG_SHADERSTAGE_VS, SLOT_fill_vs_params, SG_RANGE(fill_vs_params));

    sg_bindings fill_bind = {};
    fill_bind.vertex_buffers[0] = sg_make_buffer(sg_buffer_desc{
        .data = {.ptr = s_fill_verts.data(), .size = s_fill_verts.size() * sizeof(float)},
        .label = "fill vertices",
    });
    sg_apply_bindings(&fill_bind);

    sg_draw(0, s_fill_verts.size() / 6, 1);
    sg_destroy_buffer(fill_bind.vertex_buffers[0]);
  }
}

static void app_init() {
  stm_setup();
  s_last_fps_time = stm_now();

  sg_desc desc = {.context = sapp_sgcontext(), .logger.func = slog_func};
  sg_setup(&desc);

  sdtx_desc_t sdtx_desc = {.fonts = {sdtx_font_kc854()}, .logger.func = slog_func};
  sdtx_setup(&sdtx_desc);

  s_fill_sh = sg_make_shader(fill_shader_desc(sg_query_backend()));

  s_fill_pip = sg_make_pipeline(sg_pipeline_desc{
      .shader = s_fill_sh,
      .layout =
          {
              .attrs =
                  {
                      [ATTR_vs_fill_position].format = SG_VERTEXFORMAT_FLOAT2,
                      [ATTR_vs_fill_color].format = SG_VERTEXFORMAT_FLOAT4,
                  },
          },
      .colors[0].blend =
          {
              .enabled = true,
              .src_factor_rgb = SG_BLENDFACTOR_SRC_ALPHA,
              .dst_factor_rgb = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
          },
      .primitive_type = SG_PRIMITIVETYPE_TRIANGLES,
      .label = "fill-pipeline",
  });

  s_blit_sh = sg_make_shader(blit_shader_desc(sg_query_backend()));

  s_blit_pip = sg_make_pipeline(sg_pipeline_desc{
      .shader = s_blit_sh,
      .layout =
          {
              .attrs =
                  {
                      [ATTR_vs_blit_pos].format = SG_VERTEXFORMAT_FLOAT2,
                      [ATTR_vs_blit_texcoord0].format = SG_VERTEXFORMAT_FLOAT2,
                  },
          },
      .colors[0].blend =
          {
              .enabled = true,
              .src_factor_rgb = SG_BLENDFACTOR_SRC_ALPHA,
              .dst_factor_rgb = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
          },
      .primitive_type = SG_PRIMITIVETYPE_TRIANGLES,
      .label = "blit-pipeline",
  });

  s_sampler = sg_make_sampler(sg_sampler_desc{
      .min_filter = SG_FILTER_LINEAR,
      .mag_filter = SG_FILTER_LINEAR,
  });

  try {
    s_hermes->global().getPropertyAsFunction(*s_hermes, "on_init").call(*s_hermes);
  } catch (facebook::jsi::JSIException &e) {
    slog_func("ERROR", 1, 0, e.what(), __LINE__, __FILE__, nullptr);
    abort();
  }
}

static void app_cleanup() {
  s_images.clear();
  sdtx_shutdown();
  sg_shutdown();
}

static void app_frame() {
  uint64_t now = stm_now();
  ++s_frame_count;

  // Update FPS every second
  uint64_t diff = stm_diff(now, s_last_fps_time);
  if (diff > 1000000000) {
    s_fps = s_frame_count / stm_sec(diff);
    s_frame_count = 0;
    s_last_fps_time = now;
  }

  // Setup pass action to clear the framebuffer with yellow color
  sg_pass_action pass_action = {
      .colors[0] = {.load_action = SG_LOADACTION_CLEAR, .clear_value = {0, 0, 0, 0}}};

  // Begin and end pass
  sg_begin_default_pass(&pass_action, sapp_width(), sapp_height());

  reset_prims();
  try {
    s_hermes->global().getPropertyAsFunction(*s_hermes, "on_frame").call(*s_hermes);
  } catch (facebook::jsi::JSIException &e) {
    slog_func("ERROR", 1, 0, e.what(), __LINE__, __FILE__, nullptr);
  }
  render_prims();

  sdtx_canvas((float)sapp_width(), (float)sapp_height());
  sdtx_printf("FPS: %d", (int)(s_fps + 0.5));
  sdtx_draw();

  sg_end_pass();

  // Commit the frame
  sg_commit();
}

static void app_event(const sapp_event *ev) {
  try {
    s_hermes->global()
        .getPropertyAsFunction(*s_hermes, "on_event")
        .call(*s_hermes, (double)ev->type, (double)ev->key_code, (double)ev->modifiers);
  } catch (facebook::jsi::JSIException &e) {
    slog_func("ERROR", 1, 0, e.what(), __LINE__, __FILE__, nullptr);
  }
}

extern "C" void scroller_run(SHRuntime *shr) {
  s_hermes = _sh_get_hermes_runtime(shr);

  sapp_desc desc = {};
  desc.init_cb = app_init;
  desc.frame_cb = app_frame;
  desc.cleanup_cb = app_cleanup;
  desc.event_cb = app_event;
  desc.width = 800;
  desc.height = 600;
  desc.window_title = "Static Hermes Scroller";
  desc.logger.func = slog_func;

  sapp_run(&desc);
}
