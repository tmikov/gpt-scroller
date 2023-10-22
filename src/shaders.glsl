/// =============================================
/// fill
///
#pragma sokol @vs vs_fill
uniform fill_vs_params {
  mat4 transform;
};
in vec2 position;
void main() {
  gl_Position = transform * vec4(position, 0.0, 1.0);
}
#pragma sokol @end

#pragma sokol @fs fs_fill
uniform fill_fs_params {
  vec4 color;
};
out vec4 frag_color;
void main() {
  frag_color = color;
}
#pragma sokol @end

#pragma sokol @program fill vs_fill fs_fill

/// =============================================
/// blit
///
#pragma sokol @vs vs_blit
uniform blit_vs_params {
  mat4 transform;
};
in vec2 pos;
in vec2 texcoord0;
out vec2 uv;

void main() {
  gl_Position = transform * vec4(pos, 0.0, 1.0);
  uv = texcoord0;
}
#pragma sokol @end

#pragma sokol @fs fs_blit
uniform texture2D tex;
uniform sampler samp;

in vec2 uv;
out vec4 frag_color;

void main() {
  frag_color = texture(sampler2D(tex, samp), uv);
}
#pragma sokol @end

#pragma sokol @program blit vs_blit fs_blit
