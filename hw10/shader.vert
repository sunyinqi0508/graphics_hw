uniform mat4 uMatrix;
uniform mat4 invMatrix;
uniform mat3 transformation;
attribute float oid;
attribute vec3 aPos;
attribute vec3 normal;
varying float id;
varying vec3 glpos;
varying vec3 norm;
varying vec3 texPos;
void main() {
    vec4 pos = uMatrix * vec4(aPos, 1.);
    texPos = aPos;
    gl_Position = pos ;
    glpos = pos.xyz;
    id = oid;
    norm = normalize(vec4(normal,0.)*invMatrix).xyz;
}
