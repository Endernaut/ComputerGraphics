#version 300 es
precision highp float;
uniform vec4 color;

uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform mat4 mv;
uniform vec3 eye;

out vec4 fragColor;
in vec3 vnormal;

void main() {
    vec3 n = normalize(vnormal);
    float lambert = max(dot(n, mat3(mv) * lightdir), 0.0);
    float blinn = pow(max(dot(n, normalize(eye + mat3(mv) * lightdir)), 0.0), 150.0);
    fragColor = vec4(color.rgb * (lightcolor * lambert) + (vec3(1,1,1) * blinn), color.a);
}