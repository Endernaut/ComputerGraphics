#version 300 es

layout(location = 0) in vec4 position;
layout(location = 1) in vec4 color;
uniform mat4 rot;
uniform mat4 move;
uniform float seconds;
out vec4 vColor;
void main() {
    vColor = color;
    gl_Position = rot * move * vec4(position.x * 0.1 - 0.75, position.y * 0.1 - 0.75, position.zw);
}