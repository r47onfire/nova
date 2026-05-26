#version 300 es
precision mediump float;
in vec2 v_pos;
in vec2 v_uv;
in vec4 v_color;
out vec4 out_color;
uniform sampler2D u_tex;
vec4 def_frag() {
    vec2 sz = vec2(textureSize(u_tex, 0));
    vec4 p = vec4(1, 1, 1, 1);
    // If in bounds, use the texture, otherwise use white (for primitives)
    if(v_uv.x < sz.x && v_uv.x >= 0.f && v_uv.y < sz.y && v_uv.y >= 0.f)
        p = texture(u_tex, v_uv / sz);
    return vec4((v_color.rgb * p.rgb), p.a) * v_color.a;
}
vec4 frag(vec2 p, vec2 u, vec4 c, sampler2D t) {
    return def_frag();
}
void main() {
    if((out_color = frag(v_pos, v_uv, v_color, u_tex)).a == 0.f)
        discard;
}
