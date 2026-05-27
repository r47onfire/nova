#version 300 es
precision mediump float;
in vec2 a_pos, a_uv;
in vec4 a_color;
out vec2 v_pos, v_uv;
out vec4 v_color;
uniform vec2 screensize;
uniform mat4 camera;
uniform mat4 transform;
vec4 def_vert() {
    vec4 pos = camera * transform * vec4(a_pos, 0, 1);
    return vec4(pos.xy / screensize * 2.f - 1.f, pos.zw);
}
vec4 vert(vec2 p, vec2 u, vec4 c) {
    return def_vert();
}
void main() {
    gl_Position = vert(v_pos = a_pos, v_uv = a_uv, v_color = a_color);
}
