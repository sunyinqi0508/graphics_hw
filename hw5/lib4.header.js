//Header file, contains global variable definitions, 
// asynchronized shader loading and utility functions

var mousedx = 0, mousedy = 0, mousedz = 0;
let seldx = 0, seldy = 0, seldz = 0;
var enableSelection = false;
var cx = 1, cy = 1, sx = 0, sy = 0;
var mouselastX, mouselastY;
const fl = 3;
let start;
var vs, fs;
var vsfetch = new XMLHttpRequest();
var editor = undefined
var cos = Math.cos, sin = Math.sin, tan = Math.tan,
    acos = Math.acos, asin = Math.asin, atan = Math.atan,
    sqrt = Math.sqrt, pi = Math.PI, abs = Math.abs;
var positionsupdated = true;
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
    if (y === undefined)
        y = z = x;
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


let Matrix = function() {
    let top = 0, m = [ matrix_identity() ];
    this.identity = () => m[top] = matrix_identity();
    this.translate = (x,y,z) => m[top] = matrix_multiply(m[top], matrix_translate(x,y,z));
    this.rotateX = theta     => m[top] = matrix_multiply(m[top], matrix_rotateX(theta));
    this.rotateY = theta     => m[top] = matrix_multiply(m[top], matrix_rotateY(theta));
    this.rotateZ = theta     => m[top] = matrix_multiply(m[top], matrix_rotateZ(theta));
    this.scale   = (x,y,z)   => m[top] = matrix_multiply(m[top], matrix_scale(x,y,z));
    this.value   = ()        => m[top];
    this.save    = ()        => { m[top+1] = m[top].slice(); top++; }
    this.restore = ()        => --top;
 }
 
 
 //------ CREATING MESH SHAPES
 
 // CREATE A MESH FROM A PARAMETRIC FUNCTION
 
 let createMesh = (nu, nv, f, data, oid = 0) => {
    let tmp = [];
    for (let v = 0 ; v < 1 ; v += 1/nv) {
       for (let u = 0 ; u <= 1 ; u += 1/nu) {
          tmp = tmp.concat(f(u,v,oid,data));
          tmp = tmp.concat(f(u,v+1/nv,oid,data));
       }
       tmp = tmp.concat(f(1,v,oid,data));
       tmp = tmp.concat(f(0,v+1/nv,oid,data));
    }
    return new Float32Array(tmp);
 }
 
 // GLUE TWO MESHES TOGETHER INTO A SINGLE MESH
 
 let glueMeshes = (a, b) => {
    let c = [];
    for (let i = 0 ; i < a.length ; i++)
       c.push(a[i]);                           // a
    for (let i = 0 ; i < VERTEX_SIZE ; i++)
       c.push(a[a.length - VERTEX_SIZE + i]);  // + last vertex of a
    for (let i = 0 ; i < VERTEX_SIZE ; i++)
       c.push(b[i]);                           // + first vertex of b
    for (let i = 0 ; i < b.length ; i++)
       c.push(b[i]);                           // + b
    return new Float32Array(c);
 }
 
 
 let uvToSphere = (u,v, i) => {
    let theta = 2 * Math.PI * u;
    let phi   = Math.PI * (v - .5);
    let x = Math.cos(theta) * Math.cos(phi);
    let y = Math.sin(theta) * Math.cos(phi);
    let z = Math.sin(phi);
    return [i, x,y,z].concat(normalize([x, y, z]));
 }
 
 let uvToTube = (u,v,i) => {
    let theta = 2 * Math.PI * u;
    let x = Math.cos(theta);
    let y = Math.sin(theta);
    let z = 2 * v - 1;
    return [i,x,y,z].concat(normalize([x,y,0]));
 }
 
 let uvToDisk = (u,v,i,dz) => {
    if (dz === undefined)
       dz = 0;
    let theta = 2 * Math.PI * u;
    let x = Math.cos(theta) * v;
    let y = Math.sin(theta) * v;
    let z = dz;
    return [i,x,y,z].concat([0,0,Math.sign(z)]);
 }
 let uvToTorus = (u,v,i,r) => {
    let theta = 2 * pi;
    let phi = theta * v;
    theta *= u;
    let x = 1 + r * cos(phi);
    let y = sin(theta)*x;
    x *=cos(theta);
    let z = r * sin(phi);
    let tx = -sin(theta), ty = cos(theta),tsx = sin(phi), tsy = tsx*tx, tsz = cos(phi);
    tsx*=-ty;
    return [i,x, y, z].concat(normalize([ty*tsz*0.5, -tx*tsz, tx*tsy-ty*tsx]));
 }

let createCube = (w, h, l,id) => {
    let mesh = [];
    mesh=mesh.concat([id, -w/2,-h/2,-l/2,0,-1,0]);
    mesh=mesh.concat([id, -w/2,-h/2,l/2,0,-1,0]);
    mesh=mesh.concat([id, w/2,-h/2,-l/2,0,-1,0]);
    mesh=mesh.concat([id, w/2,-h/2,l/2,0,-1,0]);

    mesh=mesh.concat([id, w/2,-h/2,l/2,0,-1,0]);
    mesh=mesh.concat([id, w/2,-h/2,l/2,0,0,1]);
    
    mesh=mesh.concat([id, w/2,-h/2,l/2,0,0,1]);
    mesh=mesh.concat([id, w/2,h/2,l/2,0,0,1]);
    mesh=mesh.concat([id, -w/2,-h/2,l/2,0,0,1]);
    mesh=mesh.concat([id, -w/2,h/2,l/2,0,0,1]);

    mesh=mesh.concat([id, -w/2,h/2,l/2,0,0,1]);
    mesh=mesh.concat([id, -w/2,h/2,l/2,-1,0,0]);
    
    mesh=mesh.concat([id, -w/2,h/2,l/2,-1,0,0]);
    mesh=mesh.concat([id, -w/2,-h/2,l/2,-1,0,0]);
    mesh=mesh.concat([id, -w/2,h/2,-l/2,-1,0,0]);
    mesh=mesh.concat([id, -w/2,-h/2,-l/2,-1,0,0]);

    mesh=mesh.concat([id, -w/2,-h/2,-l/2,-1,0,0]);
    mesh=mesh.concat([id, -w/2,-h/2,-l/2,0,0,-1]);

    mesh=mesh.concat([id, -w/2,-h/2,-l/2,0,0,-1]);
    mesh=mesh.concat([id, -w/2,h/2,-l/2,0,0,-1]);
    mesh=mesh.concat([id, w/2,-h/2,-l/2,0,0,-1]);
    mesh=mesh.concat([id, w/2,h/2,-l/2,0,0,-1]);

    mesh=mesh.concat([id, w/2,h/2,-l/2,0,0,-1]);
    mesh=mesh.concat([id, w/2,h/2,-l/2,1,0,0]);
    
    mesh=mesh.concat([id, w/2,h/2,-l/2,1,0,0]);
    mesh=mesh.concat([id, w/2,h/2,l/2,1,0,0]);
    mesh=mesh.concat([id, w/2,-h/2,-l/2,1,0,0]);
    mesh=mesh.concat([id, w/2,-h/2,l/2,1,0,0]);

    mesh=mesh.concat([id, w/2,-h/2,l/2,1,0,0]);
    mesh=mesh.concat([id, w/2,h/2,l/2,0,1,0]);

    mesh=mesh.concat([id, w/2,h/2,l/2,0,1,0]);
    mesh=mesh.concat([id, w/2,h/2,-l/2,0,1,0]);
    mesh=mesh.concat([id, -w/2,h/2,l/2,0,1,0]);
    mesh=mesh.concat([id, -w/2,h/2,-l/2,0,1,0]);
    return new Float32Array(mesh);

    // let verts = [];
    // for(let i = -w/2; i < w; i += w)
    //     for(let j = -h/2; j < h; j += h)
    //         for (let k = -l/2; k < l; k += l)
    //             verts.push([id, i, j, k]);
    // let mesh = [];
    // let n = 0;
    // for(let j = 0; j < 4; ++ j)
    //     mesh = mesh.concat(verts[j]);
    // for(let i = 0; i < 2; ++ i)
    //     for(let j = 0; j < 2; ++ j)
    //         mesh = mesh.concat(verts[6 - i*2 + j]);
    // for(let j = 0; j < 2; ++ j)
    //     mesh = mesh.concat(verts[j]);
    // mesh = mesh.concat(verts[5]);
    // mesh = mesh.concat(verts[3]);
    // mesh = mesh.concat(verts[7]);
    // mesh = mesh.concat(verts[7]);
    // mesh = mesh.concat(verts[6]);
    // mesh = mesh.concat(verts[6]);
    // mesh = mesh.concat(verts[4]);
    // mesh = mesh.concat(verts[2]);
    // mesh = mesh.concat(verts[0]);
    // return new Float32Array(mesh); 
    //CREATING CUBES THIS WAY REDUCES VERTICES BUT MAKES IT HARDER TO DO LIGHTING
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
    if(!enableSelection)
        return -1; 
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
