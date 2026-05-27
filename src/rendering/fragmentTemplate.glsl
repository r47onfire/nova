#version 300 es
precision mediump float;
in vec2 v_pos, v_uv;
in vec4 v_color;
out vec4 fragColor;
uniform sampler2D u_tex;
uniform bool aaa;
vec4 def_frag() {
    vec4 c = vec4(1.f);
    if(v_uv.x >= 0.0f && v_uv.x <= 1.0f && v_uv.y >= 0.0f && v_uv.y <= 1.0f)
        c = texture(u_tex, v_uv);
    return vec4(v_color.rgb * c.rgb, c.a) * v_color.a;
}
vec4 frag(vec2 p, vec2 u, vec4 c, sampler2D t) {
    return def_frag();
}
void main() {
    if((fragColor = frag(v_pos, v_uv, v_color, u_tex)).a == 0.f)
        discard;
}
