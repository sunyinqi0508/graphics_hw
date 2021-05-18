uniform mat4 uMatrix;
uniform mat3 transformation;
attribute float oid;
attribute vec3 aPos;
attribute vec3 normal;
varying vec3 trPos;
varying float id;
varying vec3 norm;
varying vec3 glpos;
varying vec3 apos;
void main() {
    vec4 pos = uMatrix * vec4(aPos, 1.);
    gl_Position = pos * vec4(1., 1., -1., 1.);
    id = oid;
    norm = normalize((uMatrix*vec4(normal,0.)).xyz);
    trPos = transformation *vec3(pos.xy, -1);
    apos = aPos;
    glpos = gl_Position.xyz;
}

