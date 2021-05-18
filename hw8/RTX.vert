attribute float oid;
attribute vec3 aPos;
attribute vec3 normal;
varying   vec3 trPos;
uniform mat3 transformation; 
uniform mat4 uMatrix; 
varying float id;
varying vec3 norm;
//I used mat3 instead of the augmented mat4 matrix because we 
//are not doing complex projections yet. I implemented simple 
//perspective projection back in hw2 by changing focal length 
//and adjusting the size of the projected surface accrodingly.
//New surface = distance(surface, old viewpoint)/ distance(surface, new viewpoint) * old surface
//            = (deltaFl + fl + 1)/(fl + 1) * old surface
//This is implemented by vPos = (dFl + fl + 1)/(fl + 1) * vPos;
//Because we will multiply the resulting vPos by the transformation matrix 
//anyway, I smashed the ratio into the matrix into avoid doing this in shaders.
void main() {
    vec4 pos = uMatrix * vec4(aPos, 1.);
    gl_Position = pos;
    id = oid;
    norm = normal;
    trPos = transformation *vec3(aPos.x, -aPos.y, -1);
}