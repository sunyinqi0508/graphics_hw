//Header file, contains global variable definitions, 
// asynchronized shader loading and utility functions

let mousedx = 0, mousedy = 0, mousedz = 0;
let seldx = 0, seldy = 0, seldz = 0;

var cx = 1, cy = 1, sx = 0, sy = 0;
let mouselastX, mouselastY;
const fl = 3;
let start;
var vs, fs;
var vsfetch = new XMLHttpRequest();
var editor = undefined
let cos = Math.cos, sin = Math.sin, tan = Math.tan,
    acos = Math.acos, asin = Math.asin, atan = Math.atan,
    sqrt = Math.sqrt;
let positionsupdated = true;
vsfetch.open('GET', './shader.vert');
vsfetch.onloadend = function () {
    vs = vsfetch.responseText;
};
vsfetch.send();
//* LOADING FRAGMENT SHADER
var client = new XMLHttpRequest();
client.open('GET', './shader.frag');
client.onloadend = function () {
    fs = (client.responseText);
    //* START EVERYTHING AFTER FRAGMENT SHADER IS DOWNLOADED.
    if (editor != undefined)
        editor.getSession().setValue(fs);
};
client.send();


// I HAVE IMPLEMENTED THESE FUNCTIONS FOR YOU
let matrix_identity = () => {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
let matrix_translate = (x, y, z) => {
    let m = matrix_identity();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
}
// YOU NEED TO PROPERLY IMPLEMENT THE FOLLOWING FIVE FUNCTIONS:
let matrix_rotateX = theta => {
    let m = matrix_identity();
    m[5] = cos(theta);
    m[6] = sin(theta);
    m[9] = -sin(theta);
    m[10] = cos(theta);
    return m;
}


let matrix_rotateY = theta => {
    let m = matrix_identity();
    m[0] = cos(theta);
    m[2] = -sin(theta);
    m[8] = sin(theta);
    m[10] = cos(theta);
    return m;
}
let matrix_rotateZ= theta => {
    let m = matrix_identity();
    m[0] = cos(theta);
    m[1] = sin(theta);
    m[4] = -sin(theta);
    m[5] = cos(theta);
    return m;
}
let matrix_scale = (x, y, z) => {
    let m = matrix_identity();
    m[0] = x;
    m[5] = y;
    m[10] = z;
    return m;
}
let matrix_multiply = (a, b, m = 4, n = 4) => { //dim=mn*nm=mm
    let res = [];
    if (b.length < m*n) { //mat-vec multiply (i did this for my convenience)
        for (let i = 0; i < m; ++i) {
            res[i] = 0;
            for (let j = 0; j < n; ++j)
                res[i] += b[j] * a[m * j + i];
        }
        return res;
    } //otherwise mm multiply
    for (let i = 0; i < m; ++i)
        for (let j = 0; j < m; ++j) {
            var t = 0;
            for (let k = 0; k < n; ++k)
                t += a[k * m + j] * b[i * n + k];
            res.push(t);
        }
    return res;
}
let const_multiply = (c, a) => {
    let m = [];
    for(let i = 0; i < a.length; ++ i)
        m[i] = a[i] * c;
    return m;
}
function dot(a, b){
    let m = 0;
    for(let i = 0; i < a.length; ++i)
        m += a[i] * b[i];
    return m;
}
function plus(a, b){
    let m = [];
    for(let i = 0; i < a.length; ++i)
        m[i] = a[i] + b[i];
    return m;
}
function minus(a, b){
    let m = [];
    for(let i = 0; i < a.length; ++i)
        m[i] = a[i] - b[i];
    return m;
}
function normalize(v){
    let res = [];
    sum = 0;
    for(let i = 0; i < v.length; ++ i)
        sum += v[i] * v[i];
    sum = sqrt(sum);
    for(let i = 0; i < v.length; ++ i)
        res[i] = v[i] / sum;
    return res;
}
function updatePositions() {
    let m = matrix_rotateY(-mousedx);
    m = matrix_multiply(m, matrix_rotateX(-mousedy));
    setUniform('3f', 'V0', m[8] * (fl + mousedz), m[9] * (fl + mousedz), m[10] * (fl + mousedz));
    m = const_multiply((fl + 1 + mousedz)/(fl+1), m);
    setUniform('Matrix3fv', 'transformation', false, [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
    positionsupdated = false;
}
function hitTest(pos){
    let m = matrix_rotateY(-mousedx);
    m = matrix_multiply(m, matrix_rotateX(-mousedy));
    let V = [m[8] * (fl + mousedz), m[9] * (fl + mousedz), m[10] * (fl + mousedz)];
    m = const_multiply((fl + 1 + mousedz)/(fl+1), m);
    let trPos = matrix_multiply([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]], pos, 3,3);
 
    let W=normalize(minus(trPos, V));
    let tMin=10000.;
    let iMin = -1;
    for(let i=0;i<cns;i++){
    let Vp=minus(V, matrix_multiply(SphTr[i], Sph[i]));
    let B=dot(W,Vp);
    let C=dot(Vp,Vp)-Sph[i][4]*Sph[i][4];
    let D=B*B-C;
    if(D>0.){
       let t=-B-sqrt(D);
       if(t > 0.0 && t < tMin){
          tMin = t; // This is an optimization, we don't have to do lighting/tex
          iMin = i; // for objects that are occuluded, which is expensive!
       }
       }
    }
    return iMin;
 }
