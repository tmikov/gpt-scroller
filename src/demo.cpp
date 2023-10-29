#include "sokol_app.h"
#include "sokol_gfx.h"
#include "sokol_glue.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "stb_image.h"

#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "sokol_imgui.h"

// Must be separate to avoid reordering.
#include "sokol_debugtext.h"

#include "soloud.h"
#include "soloud_wav.h"
#include "soloud_wavstream.h"

#include <deque>
#include <map>
#include <memory>
#include <vector>

#include "shaders.h"

class Sound {
  bool const enabled_;
  SoLoud::Soloud soloud;

 public:
  //  SoLoud::WavStream music;
  SoLoud::Wav explosion;
  SoLoud::Wav shot;

  explicit Sound(bool enabled) : enabled_(enabled) {
    if (!enabled_)
      return;
    this->soloud.init();
    //    this->music.load("/Users/tmikov/prog/media/fun2.mp3");
    //    this->music.setLooping(true);
    //    this->play(this->music);

    this->explosion.load("explosion-6055.mp3");
    this->explosion.setVolume(0.5);
    this->shot.load("laser_gun_sound-40813.mp3");
    this->shot.setVolume(0.2);
  }

  void play(SoLoud::AudioSource &sound) {
    if (!enabled_)
      return;
    soloud.play(sound);
  }
};
//

static const float PHYS_FPS = 60;
static const float PHYS_DT = 1.0f / PHYS_FPS;
static const float ASSUMED_W = 800;
static const float INV_ASSUMED_W = 1.0f / ASSUMED_W;
static const float ASSUMED_H = 600;
static const float INV_ASSUMED_H = 1.0f / ASSUMED_H;

/// Transform from [0..ASSUMED_W][0..ASSUMED_H] to [-1..1][-1..1].
static const float s_transformMat[16] = {
    2.0f / ASSUMED_W,
    0.0f,
    0.0f,
    0.0f,
    0.0f,
    -2.0f / ASSUMED_H,
    0.0f,
    0.0f, // Negate to flip y-axis
    0.0f,
    0.0f,
    1.0f,
    0.0f,
    -1.0f,
    1.0f,
    0.0f,
    1.0f // Translate after scaling
};

static double mathRandom(double range) {
  return rand() * (1.0 / (RAND_MAX + 1.0)) * range;
}

class Image {
 public:
  int w_ = 0, h_ = 0;
  sg_image image_ = {};

  explicit Image(const char *path) {
    int n;
    unsigned char *data = stbi_load(path, &w_, &h_, &n, 4);
    if (!data)
      abort();

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

static sg_shader s_fill_sh = {};
static sg_shader s_blit_sh = {};

static sg_pipeline s_fill_pip = {};
static sg_pipeline s_blit_pip = {};
static sg_sampler s_sampler = {};

/// Map from an image id to an index in s_img_list.
static std::map<uint32_t, unsigned> s_img_index{};
/// List of vertices in the vertex pool associated with an image.
static std::vector<std::pair<sg_image, std::vector<float> *>> s_img_list{};
/// Lists of triangle vertices. {x, y, u, v}
static std::deque<std::vector<float>> s_vert_pool{};

/// List of fill triangle vertices. {x, y, r, g, b, a};
static std::vector<float> s_fill_verts{};

static int s_frame_count = 0;
static double s_fps = 0;
static uint64_t s_last_fps_time;

static std::unique_ptr<Image> s_ship_image;
static std::unique_ptr<Image> s_enemy_image;
static std::unique_ptr<Image> s_background_image;
static std::unique_ptr<Sound> s_sound;

static int s_enemySpawnCounter = 0;
static const int s_enemySpawnRate = 120;

static float s_oldBackgroundX = 0;
static float s_backgroundX = 0;
static float s_backgroundSpeed = 2;

static bool s_keys[512];

static void load_images() {
  s_ship_image = std::make_unique<Image>("ship.png");
  s_enemy_image = std::make_unique<Image>("enemy.png");
  s_background_image = std::make_unique<Image>("background.png");
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

static void draw_fill_px(float x, float y, float w, float h, sg_color color) {
  push_rect_with_color(s_fill_verts, x, y, w, h, color);
}

static void draw_blit_px(Image *image, float x, float y, float w, float h) {
  // If this is a new image, add it to the image list and create a new vertex list.
  auto [it, inserted] = s_img_index.try_emplace(image->image_.id, 0);
  if (inserted) {
    s_vert_pool.emplace_back();
    s_img_list.emplace_back(image->image_, &s_vert_pool.back());
    it->second = s_img_list.size() - 1;
  }

  push_rect(*s_img_list[it->second].second, x, y, w, h);
}

static void reset_blits() {
  for (auto &verts : s_vert_pool)
    verts.clear();
  s_fill_verts.clear();
}

static void render_blits() {
  {
    sg_apply_pipeline(s_blit_pip);

    sg_bindings blit_bind = {};
    blit_bind.fs.samplers[SLOT_samp] = s_sampler;

    blit_vs_params_t blit_vs_params;
    memcpy(blit_vs_params.transform, s_transformMat, sizeof(s_transformMat));

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
    memcpy(fill_vs_params.transform, s_transformMat, sizeof(s_transformMat));
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

class Actor {
 public:
  float oldX, oldY;
  float x, y, width, height, velX, velY;

  explicit Actor(float x, float y, float width, float height, float velX, float velY)
      : oldX(x), oldY(y), x(x), y(y), width(width), height(height), velX(velX), velY(velY) {}

  virtual void update(bool save) {
    if (save) {
      oldX = x;
      oldY = y;
    }
    x += velX;
    y += velY;
  }

  float curX(float dt) const {
    return x + (x - oldX) * dt;
  }
  float curY(float dt) const {
    return y + (y - oldY) * dt;
  }
};

class Ship : public Actor {
 public:
  float speed = 5 * 2;
  explicit Ship(float x, float y) : Actor(x, y, s_ship_image->w_, s_ship_image->h_, 0, 0) {}

  virtual void update(bool save) {
    if (s_keys[SAPP_KEYCODE_LEFT])
      velX = -speed;
    else if (s_keys[SAPP_KEYCODE_RIGHT])
      velX = speed;
    else
      velX = 0;
    if (s_keys[SAPP_KEYCODE_UP])
      velY = -speed;
    else if (s_keys[SAPP_KEYCODE_DOWN])
      velY = speed;
    else
      velY = 0;
    Actor::update(save);
  }

  void draw(float dt) const {
    draw_blit_px(s_ship_image.get(), curX(dt), curY(dt), width, height);
  }
};

class Enemy : public Actor {
 public:
  explicit Enemy(float x, float y) : Actor(x, y, 64, 64, -2 * 2, 0) {}

  void draw(float dt) const {
    draw_blit_px(s_enemy_image.get(), curX(dt), curY(dt), width, height);
  }
};

class Bullet : public Actor {
 public:
  explicit Bullet(float x, float y) : Actor(x, y, 5, 5, 8 * 2, 0) {}

  void draw(float dt) const {
    draw_fill_px(curX(dt), curY(dt), width, height, {1, 1, 0, 1});
  }
};

class Particle : public Actor {
 public:
  float life, maxLife, alpha;

  explicit Particle(float x, float y)
      : Actor(x, y, 0, 0, (mathRandom(4) - 2) * 2, ((mathRandom(4) - 2) * 2)),
        life(0),
        maxLife((mathRandom(30) + 50) / 2),
        alpha(1) {
    width = height = mathRandom(2) + 1;
  }

  virtual void update(bool save) {
    Actor::update(save);
    ++life;
    alpha = 1 - (life / maxLife);
  }

  void draw(float dt) const {
    draw_fill_px(curX(dt) - width / 2, curY(dt) - height / 2, width, height, {1, 0.5, 0, alpha});
  }

  bool isAlive() const {
    return life < maxLife;
  }
};

class Explosion {
 public:
  float x, y;
  std::vector<Particle> particles;

  explicit Explosion(float x, float y) : x(x), y(y) {
    for (int i = 0; i < 50; ++i) {
      particles.emplace_back(x, y);
    }
  }

  void update(bool save) {
    for (long i = 0; i < particles.size();) {
      particles[i].update(save);
      if (!particles[i].isAlive()) {
        particles.erase(particles.begin() + i);
        continue;
      }
      ++i;
    }
  }

  void draw(float dt) const {
    for (auto &particle : particles) {
      particle.draw(dt);
    }
  }

  bool isAlive() const {
    return !particles.empty();
  }
};

static std::unique_ptr<Ship> s_ship;
static std::vector<Bullet> s_bullets;
static std::vector<Enemy> s_enemies;
static std::vector<Explosion> s_explosions;
static bool s_pause = false;

void app_init() {
  stm_setup();
  s_last_fps_time = stm_now();

  sg_desc desc = {.context = sapp_sgcontext(), .logger.func = slog_func};
  sg_setup(&desc);
  simgui_setup(simgui_desc_t{});

  load_images();
  s_sound = std::make_unique<Sound>(getenv("NOSOUND") == nullptr);

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

  sdtx_desc_t sdtx_desc = {.fonts = {sdtx_font_kc854()}, .logger.func = slog_func};
  sdtx_setup(&sdtx_desc);

  s_ship = std::make_unique<Ship>(800.0f / 2, 600.0f / 2);
}

void app_cleanup() {
  s_sound.reset();
  sdtx_shutdown();
  s_ship_image.reset();
  s_enemy_image.reset();
  s_background_image.reset();
  sg_destroy_shader(s_fill_sh);
  sg_destroy_pipeline(s_fill_pip);
  sg_shutdown();
}

void app_event(const sapp_event *ev) {
  if (simgui_handle_event(ev))
    return;

  if (ev->type == SAPP_EVENTTYPE_KEY_DOWN) {
    if (ev->key_code == SAPP_KEYCODE_Q && (ev->modifiers & SAPP_MODIFIER_SUPER)) {
      sapp_request_quit();
      return;
    }
    s_keys[ev->key_code] = true;
    if (ev->key_code == SAPP_KEYCODE_SPACE) {
      s_bullets.emplace_back(s_ship->x + s_ship->width, s_ship->y + s_ship->height / 2.0 - 2.5);
      s_sound->play(s_sound->shot);
    }
  } else if (ev->type == SAPP_EVENTTYPE_KEY_UP) {
    s_keys[ev->key_code] = false;
    if (ev->key_code == SAPP_KEYCODE_P)
      s_pause = !s_pause;
  }
}

static bool checkCollision(Actor &a, Actor &b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

static void createExplosion(float x, float y) {
  s_explosions.emplace_back(x, y);
  s_sound->play(s_sound->explosion);
}

static sg_pass_action s_pass_action = {
    .colors[0] = {.load_action = SG_LOADACTION_CLEAR, .clear_value = {0, 0, 0, 0}}};

static void gui_frame() {
  simgui_new_frame({
      .width = sapp_width(),
      .height = sapp_height(),
      .delta_time = sapp_frame_duration(),
      .dpi_scale = sapp_dpi_scale(),
  });

  /*=== UI CODE STARTS HERE ===*/
  igSetNextWindowPos((ImVec2){10, 10}, ImGuiCond_Once, (ImVec2){0, 0});
  igSetNextWindowSize((ImVec2){400, 100}, ImGuiCond_Once);
  igBegin("Hello Dear ImGui!", 0, ImGuiWindowFlags_None);
  igColorEdit3("Background", &s_pass_action.colors[0].clear_value.r, ImGuiColorEditFlags_None);
  igEnd();
  /*=== UI CODE ENDS HERE ===*/
}

// Update game state
static void update_game_state(bool save) {
  if (save)
    s_oldBackgroundX = s_backgroundX;
  s_backgroundX -= s_backgroundSpeed;
  if (s_backgroundX <= -s_background_image->w_) {
    s_backgroundX += s_background_image->w_;
    s_oldBackgroundX += s_background_image->w_;
  }

  s_ship->update(save);

  for (long i = 0; i < s_bullets.size();) {
    s_bullets[i].update(save);
    if (s_bullets[i].x > ASSUMED_W) {
      s_bullets.erase(s_bullets.begin() + i);
      continue;
    }
    ++i;
  }

  ++s_enemySpawnCounter;
  if (s_enemySpawnCounter >= s_enemySpawnRate) {
    float y = mathRandom(ASSUMED_H - 64);
    s_enemies.emplace_back(ASSUMED_W, y);
    s_enemySpawnCounter = 0;
  }

  for (long i = 0; i < s_enemies.size();) {
    s_enemies[i].update(save);

    if (s_enemies[i].x < -s_enemies[i].width) {
      s_enemies.erase(s_enemies.begin() + i);
      continue;
    }

    bool destroy = false;
    if (checkCollision(*s_ship, s_enemies[i])) {
      createExplosion(
          s_enemies[i].x + s_enemies[i].width / 2, s_enemies[i].y + s_enemies[i].height / 2);
      destroy = true;
    } else {
      for (long j = 0; j < s_bullets.size();) {
        if (checkCollision(s_bullets[j], s_enemies[i])) {
          if (!destroy) {
            createExplosion(
                s_enemies[i].x + s_enemies[i].width / 2, s_enemies[i].y + s_enemies[i].height / 2);
          }
          s_bullets.erase(s_bullets.begin() + j);
          destroy = true;
          continue;
        }
        ++j;
      }
    }
    if (destroy) {
      s_enemies.erase(s_enemies.begin() + i);
      continue;
    }
    ++i;
  }

  for (long i = 0; i < s_explosions.size();) {
    s_explosions[i].update(save);
    if (!s_explosions[i].isAlive()) {
      s_explosions.erase(s_explosions.begin() + i);
      continue;
    }
    ++i;
  }
}

// Render game frame
static void render_game_frame(float dt) {
  float bkgX = s_oldBackgroundX + (s_backgroundX - s_oldBackgroundX) * dt;
  draw_blit_px(s_background_image.get(), bkgX, 0, s_background_image->w_, ASSUMED_H);
  draw_blit_px(
      s_background_image.get(),
      bkgX + s_background_image->w_,
      0,
      s_background_image->w_,
      ASSUMED_H);

  s_ship->draw(dt);

  for (const auto &bullet : s_bullets) {
    bullet.draw(dt);
  }

  for (const auto &enemy : s_enemies) {
    enemy.draw(dt);
  }

  for (const auto &explosion : s_explosions) {
    explosion.draw(dt);
  }
}

static bool s_started = false;
static uint64_t s_start_time = 0;
static double s_last_game_time = 0;
static double s_game_time = 0;

void app_frame() {
  uint64_t now = stm_now();
  ++s_frame_count;

  // Update FPS every second
  uint64_t diff = stm_diff(now, s_last_fps_time);
  if (diff > 1000000000) {
    s_fps = s_frame_count / stm_sec(diff);
    s_frame_count = 0;
    s_last_fps_time = now;
  }

  gui_frame();
  reset_blits();

  if (!s_started) {
    s_started = true;
    s_start_time = now;
  }

  double render_time = stm_sec(stm_diff(now, s_start_time));
  bool save = true;
  while (s_game_time <= render_time) {
    if (save)
      s_last_game_time = s_game_time;
    s_game_time += PHYS_DT;
    if (!s_pause)
      update_game_state(save);
    save = false;
  }

  // s_last_game_time ... render_time ... s_game_time
  float renderDT = render_time >= s_last_game_time && s_game_time > s_last_game_time
      ? (render_time - s_last_game_time) / (s_game_time - s_last_game_time)
      : 0;
  render_game_frame(renderDT);

  sdtx_canvas((float)sapp_width(), (float)sapp_height());
  sdtx_printf("FPS: %d", (int)(s_fps + 0.5));

  // Begin and end pass
  sg_begin_default_pass(&s_pass_action, sapp_width(), sapp_height());
  render_blits();
  sdtx_draw();
  simgui_render();
  sg_end_pass();

  // Commit the frame
  sg_commit();
}

int main() {
  sapp_desc desc = {};
  desc.init_cb = app_init;
  desc.frame_cb = app_frame;
  desc.cleanup_cb = app_cleanup;
  desc.event_cb = app_event;
  desc.width = 800;
  desc.height = 600;
  desc.window_title = "C GPT Scroller";
  desc.logger.func = slog_func;

  sapp_run(&desc);
  return 0;
}
