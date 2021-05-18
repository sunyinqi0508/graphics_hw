//Header file, contains global variable definitions, 
// asynchronized shader loading and utility functions

var mousedx = 0,
    mousedy = 0,
    mousedz = 0;
let seldx = 0,
    seldy = 0,
    seldz = 0;
var enableSelection = false;
var cx = 1,
    cy = 1,
    sx = 0,
    sy = 0,
    shaders = [];
var mouselastX, mouselastY
    ;
var fl = 3;
let start;
var vs, fs;
var bezierMat = [-1, 3, -3, 1, 3, -6, 3, 0, -3, 3, 0, 0, 1, 0, 0, 0],
    hermiteMat = [2, -3, 0, 1, -2, 3, 0, 0, 1, -2, 1, 0, 1, -1, 0, 0],
    catmullRomMat = [-.5, 1, -.5, 0, 1.5, -2.5, 0, 1, -1.5, 2, .5, 0, .5, -.5, 0, 0];
var starColors = [0.9921, 0.5378, 0.7109,
        0.65, 0.56, 0.992,
        0.992, 0.7994, 0.2402,
        0.1760, 0.5094, 0.5378,
        .1164, .1274, .2289,
        .9784, .71, .4482,
    ],
    n_shapes = starColors.length / 3;
var editor = undefined
var cos = Math.cos,
    sin = Math.sin,
    tan = Math.tan,
    acos = Math.acos,
    asin = Math.asin,
    atan = Math.atan,
    sqrt = Math.sqrt,
    pi = Math.PI,
    abs = Math.abs,
    pow = Math.pow,
    log = Math.log;
var positionsupdated = true;
var paths = [],
    origpath = [],
    path_misc = [];
var canvas_controls = [];
let vsfetch = new XMLHttpRequest();
vsfetch.open('GET', './shader.vert');
vsfetch.onloadend = function () {
    vs = vsfetch.responseText;
};
vsfetch.send();
//* LOADING FRAGMENT SHADER
let fsfetch = new XMLHttpRequest();
fsfetch.open('GET', './shader.frag');
fsfetch.onloadend = function () {
    fs = (fsfetch.responseText);
    //* START EVERYTHING AFTER FRAGMENT SHADER IS DOWNLOADED.
    if (editor != undefined)
        editor.getSession().setValue(fs);
};
fsfetch.send();
let pathFetch = new XMLHttpRequest();
pathFetch.open('GET', './paths.txt');
pathFetch.onloadend = function () {
    let text = pathFetch.responseText;
    let currX = 0,
        currY = 0,
        maxX = -10000,
        maxY = -10000,
        minX = 10000,
        minY = 10000;
    var currShape = [],
        currCurve = [];
    let i = 0;
    let postProcess = () => {
        if (currShape.length) {
            let spanX = maxX - minX;
            let spanY = maxY - minY;
            let span = Math.max(spanX, spanY);
            let l_total = 0;
            for (var k = 0; k < currShape.length; ++k) {
                let funcs = [];
                const curve = currShape[k];
                for (let j = 0; j < curve.length; j += 2) {
                    curve[j] = (curve[j] - minX) / span - spanX / (span * 2);
                    curve[j + 1] = (curve[j + 1] - minY) / span - spanY / (span * 2);
                    origpath.push(1, curve[j], curve[j + 1], 0, 0, 0, 1);
                    if (j % 6 == 0 && j > 5) {
                        let X = [],
                            Y = [];
                        for (let k = j - 6; k <= j + 1; k += 2) {
                            X.push(curve[k]);
                            Y.push(curve[k + 1]);
                        }
                        let l = (vec_len(minus([X[3], Y[3]], [X[0], Y[0]])) +
                            vec_len(minus([X[3], Y[3]], [X[2], Y[2]])) +
                            vec_len(minus([X[2], Y[2]], [X[1], Y[1]])) +
                            vec_len(minus([X[1], Y[1]], [X[0], Y[0]]))) / 2.;
                        l_total += l;
                        funcs.push([matrix_multiply(bezierMat, X),
                            matrix_multiply(bezierMat, Y), l
                        ]);
                    }

                }
                paths.push(funcs);
                path_misc.push([l_total, spanX / (2 * span), spanY / (2 * span)]);

            }
        }
    }
    let read_num = () => {
        let num = 0,
            sign = 1,
            accepted = 0;

        while (i < text.length && (text[i] < '0' || text[i] > '9') && text[i] != '-') ++i;
        if (text[i] == '-') {
            sign = -1;
            ++i;
        }
        while (i < text.length && text[i] >= '0' && text[i] <= '9') {
            let n = text[i++] - '0';
            accepted *= 10;
            accepted += n;
        }

        num += accepted;
        if (text[i] == '.') {
            i++;
            let multiplier = 0.1;
            accepted = 0;
            while (i < text.length && text[i] >= '0' && text[i] <= '9') {
                let n = text[i++] - '0';
                accepted += n * multiplier;
                multiplier /= 10;
            }
            num += accepted;
        }
        return num * sign;
    }
    let cRevs = [],
        c_idx = 0,
        prevX = 0,
        prevY = 0,
        getC = () => {
            return cRevs[c_idx--];
        }
    let get_next = (delta = false) => {
        if (delta) {
            currX = prevX + read_num();
            currY = prevY + read_num();
        } else {
            currX = read_num();
            currY = read_num();
        }
        maxX = currX > maxX ? currX : maxX;
        maxY = currY > maxY ? currY : maxY;
        minX = currX < minX ? currX : minX;
        minY = currY < minY ? currY : minY;

        currCurve.push(currX);
        currCurve.push(currY);
    }
    while (i < text.length) {
        if (text[i] == 'z') {
            currCurve.length && currShape.push(currCurve);
            currCurve = [];
            ++i
        } else if (text[i] == 'N') {
            postProcess();
            currShape = [];
            maxX = -1000, maxY = -1000, minX = 1000, minY = 1000;
            ++i;
        } else if (text[i] == 'c') {

            prevX = currX;
            prevY = currY;

            for (let j = 0; j < 3; ++j) {
                get_next(true);
            }
        } else if (text[i] == 'C') {
            for (let j = 0; j < 3; ++j) {
                get_next();
            }
        } else if (text[i] == 'M') {
            get_next();
        } else ++i;
    }
};
pathFetch.send();
let rtx_VFetch = new XMLHttpRequest(), rtxvshader_txt;
rtx_VFetch.open('GET', './RTX.vert');
rtx_VFetch.onloadend = function() {
    rtxvshader_txt = rtx_VFetch.responseText;
};
rtx_VFetch.send();
let rtx_FFetch = new XMLHttpRequest();
rtx_FFetch.open('GET', './RTX.frag');
rtx_FFetch.onloadend = function () {
    let rtxfs_text = rtx_FFetch.responseText;

    let interval = setInterval(()=>{
            if(buildShaders && rtxvshader_txt && canvas1.gl) 
            {
                gl.shaders[1] = buildShaders(rtxvshader_txt, rtxfs_text);
                clearInterval(interval);
            }
        }, 1);
}
rtx_FFetch.send()
let vec_len = v => {
    let len = 0;
    for (let i = 0; i < v.length; ++i)
        len += v[i] * v[i];
    return sqrt(len);
}
let matrix_inverse = src => {
    let dst = [],
        det = 0,
        cofactor = (c, r) => {
            let s = (i, j) => src[c + i & 3 | (r + j & 3) << 2];
            return (c + r & 1 ? -1 : 1) * ((s(1, 1) * (s(2, 2) * s(3, 3) - s(3, 2) * s(2, 3))) -
                (s(2, 1) * (s(1, 2) * s(3, 3) - s(3, 2) * s(1, 3))) +
                (s(3, 1) * (s(1, 2) * s(2, 3) - s(2, 2) * s(1, 3))));
        }
    for (let n = 0; n < 16; n++) dst.push(cofactor(n >> 2, n & 3));
    for (let n = 0; n < 4; n++) det += src[n] * dst[n << 2];
    for (let n = 0; n < 16; n++) dst[n] /= det;
    return dst;
}

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
let matrix_perspective = (m) => {
    let ret = []
    for (let i = 0; i < 16; i++)
        ret[i] = m[i];
    for (let i = 2; i < 15; i += 4) {
        ret[i] = -ret[i];
        ret[i + 1] += ret[i] / fl;
    }

    return ret;
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
let matrix_rotateZ = theta => {
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
    if (b.length < m * n) { //mat-vec multiply (i did this for my convenience)
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
let const_multiply = (c, a, add = 0) => {
    let m = [];
    for (let i = 0; i < a.length; ++i)
        m[i] = (a[i] + add)* c;
    return m;
}

function dot(a, b) {
    b=b?b:a;
    let m = 0;
    for (let i = 0; i < a.length; ++i)
        m += a[i] * b[i];
    return m;
}

function cross(a, b){
    let m = [];
    m[0] = a[1]*b[2] - a[2]*b[1];
    m[1] = a[2]*b[0] - a[0]*b[2];
    m[2] = a[0]*b[1] - a[1]*b[0];
    return m;
}

function plus(a, b) {
    let m = [];
    for (let i = 0; i < a.length; ++i)
        m[i] = a[i] + b[i];
    return m;
}

function minus(a, b) {
    let m = [];
    for (let i = 0; i < a.length; ++i)
        m[i] = a[i] - b[i];
    return m;
}

function normalize(v) {
    let res = [];
    sum = 0;
    for (let i = 0; i < v.length; ++i)
        sum += v[i] * v[i];
    sum = sqrt(sum);
    for (let i = 0; i < v.length; ++i)
        res[i] = v[i] / sum;
    return res;
}


let Matrix = function () {
    let top = 0,
        m = [matrix_identity()];
    this.identity = () => m[top] = matrix_identity();
    this.translate = (x, y, z) => m[top] = matrix_multiply(m[top], matrix_translate(x, y, z));
    this.rotateX = theta => m[top] = matrix_multiply(m[top], matrix_rotateX(theta));
    this.rotateY = theta => m[top] = matrix_multiply(m[top], matrix_rotateY(theta));
    this.rotateZ = theta => m[top] = matrix_multiply(m[top], matrix_rotateZ(theta));
    this.scale = (x, y, z) => m[top] = matrix_multiply(m[top], matrix_scale(x, y, z));
    this.apply = (m1) => m[top] = matrix_multiply(m[top], m1); 
    this.applyl = (m1) => m[top] = matrix_multiply(m1, m[top]); 
    this.value = () => m[top];
    this.save = () => {
        m[top + 1] = m[top].slice();
        top++;
    }
    this.restore = () => --top;
}
function hitTest_sphere(ray, sphere, r) {
    let B = dot(ray, sphere);
    let C = dot(sphere, sphere) - r*r;
    let D = B * B - C;
    if (D > 0.) {
        //console.log(D);
        //let t = -B - sqrt(D);
        return 1;
    }
    return -1;
}
function hitTest_square(pt, invMatrix, shape){
    pt.push(1);
    const V = dot_xyz(matrix_multiply(invMatrix, [0,0,fl,1])),
     pos = dot_xyz(matrix_multiply(invMatrix, pt)),
     W = minus(pos, V),
     A = shape.slice(1,4),
     B = shape.slice(8,11),
     C = shape.slice(15,18),
     AB = minus(B, A),
     AC = minus(C, A),
     AB_AC = cross(AB, AC),
     VA = minus(V, A),
     t = - dot(AB_AC, VA)/dot(W, AB_AC),
     P = plus(V, const_multiply(t, W)),
     AP = minus(P, A),
     d_AP_AC = dot(AP, AC),
     d_AP_AB = dot(AP, AB);
    if(0 <d_AP_AC && d_AP_AC < dot(AC, AC) && 0 < d_AP_AB && d_AP_AB< dot(AB, AB))
        return P; 
    else return -1;
}
let dot_xyz = (v) => {
    let ret = [];
    if(v[3])
        for(let i = 0; i < 3; ++i)
            ret[i] = v[i]/v[3];
    else ret = v.slice(0,3);
    return ret;
}
let Button = function (onclick = () => {}, shape = [], outlineTy = 'sphere') {
    this.shape = shape;
    this.enabled = true;
    this.outlineTy = outlineTy;
    this.onClick = onclick;
    this.updateMatrix = (m) => {this.matrix = matrix_perspective(m); this.invMatrix = matrix_inverse(m);};
    this.updateMatrix(matrix_identity());
    this.hovering = false;
    this.activated = false;
    this.getShape = () => this.shape;
    this.draw = () => {setUniform('Matrix4fv', 'uMatrix', false, this.matrix);
    setUniform('Matrix4fv', 'invMatrix', false, this.invMatrix); drawMesh(this.shape);}
    this.resetShape = (_sh) => {
        if(this.shape) delete this.shape;
        this.shape = new Float32Array(_sh);
        let maxV =  new Array(3).fill(-Infinity), minV = new Array(3).fill(Infinity);
        for(let i = 0; i < _sh.length; i += 7){
            const v = [_sh[i + 1], _sh[i + 2], _sh[i + 3]];
            v.forEach((c, j) => {
                maxV[j] = maxV[j] > c ? maxV[j] : c;
                minV[j] = minV[j] < c ? minV[j] : c;
            })
        }
        //build outline
        switch(this.outlineTy){
            case 'sphere':
                this.origin = const_multiply(.5, plus(maxV, minV));
                //this.origin.push(1);
                this.radius = 0.6*vec_len(minus(maxV, minV))/2.;
                break;
            case 'square':
                break;
            case 'circle':
                break;
            }
        switch(this.outlineTy){
        case 'sphere':
            this.hitTest = (pt) => {
                pt.push(1);
                const V = dot_xyz(matrix_multiply(this.invMatrix, [0,0,fl,1])),
                 pos = dot_xyz(matrix_multiply(this.invMatrix, pt));
                let W = normalize((minus(pos, V)));
                let Vp = minus(V, this.origin);
                return hitTest_sphere(W, Vp, this.radius);
            }
            break;
        case 'square':
            this.hitTest = (pt) => {
                this.P = hitTest_square(pt, this.invMatrix, this.shape);
                return this.P;
            }
            break;
        case 'circle':
            break;
        }
    };
    if(!shape || shape.length != 0)
        this.resetShape(shape);
    canvas_controls.push(this);
}
let setM = (m) => {
    let mm = matrix_perspective(m);
    setUniform('Matrix4fv', 'uMatrix', false, mm);
    setUniform('Matrix4fv', 'invMatrix', false, matrix_inverse(mm));
}
//------ CREATING MESH SHAPES

// CREATE A MESH FROM A PARAMETRIC FUNCTION

let createMesh = (nu, nv, f, data, oid = 0) => {
    let tmp = [];
    for (let v = 0; v < 1; v += 1 / nv) {
        for (let u = 0; u <= 1; u += 1 / nu) {
            tmp = tmp.concat(f(u, v, oid, data));
            tmp = tmp.concat(f(u, v + 1 / nv, oid, data));
        }
        tmp = tmp.concat(f(1, v, oid, data));
        tmp = tmp.concat(f(0, v + 1 / nv, oid, data));
    }
    return new Float32Array(tmp);
}
//Create a Mesh from Splines
let createMeshFromSpline = (idx,
    nu, nv, oid = 16, additional_offset = 0, f = () => {}) => {
    let S = paths[idx],
        meta = path_misc[idx];
    const n_min = 2;
    let ds = meta[0] / nv,
        curr_s = 0,
        curr_d = S[0][2] / Math.ceil(S[0][2] / ds),
        i = 0,
        s = 0;
    let tmp = [],
        ret = undefined;
    while (s < meta[0] - 1 / 100000) {

        for (let u = 0; u <= 1; u += 1 / nu) {
            tmp = tmp.concat(getSurface(S[i][1], S[i][0], u, curr_s, idx, oid, additional_offset));
            tmp = tmp.concat(getSurface(S[i][1], S[i][0], u, curr_s + curr_d, idx, oid, additional_offset));
        }
        tmp = tmp.concat(getSurface(S[i][1], S[i][0], 0, curr_s, idx, oid, additional_offset));
        tmp = tmp.concat(getSurface(S[i][1], S[i][0], 1, curr_s + curr_d, idx, oid, additional_offset));
        if (ret = f(i, tmp, oid)) {
            oid = ret;
        }
        curr_s += curr_d;
        if (curr_s >= 1) {
            s += S[i][2];
            ++i;
            if (i >= S.length)
                break;
            let curr_n = Math.ceil(S[i][2] / ds);
            curr_n = curr_n < n_min ? n_min : curr_n;
            curr_d = 1 / curr_n;
            curr_s = 0;
        }
    }
    return new Float32Array(tmp);
}
// GLUE TWO MESHES TOGETHER INTO A SINGLE MESH

let glueMeshes = (a, b) => {
    let c = [];
    for (let i = 0; i < a.length; i++)
        c.push(a[i]); // a
    for (let i = 0; i < VERTEX_SIZE; i++)
        c.push(a[a.length - VERTEX_SIZE + i]); // + last vertex of a
    for (let i = 0; i < VERTEX_SIZE; i++)
        c.push(b[i]); // + first vertex of b
    for (let i = 0; i < b.length; i++)
        c.push(b[i]); // + b
    return new Float32Array(c);
}


let uvToSphere = (u, v, i) => {
    let theta = 2 * Math.PI * u;
    let phi = Math.PI * (v - .5);
    let x = Math.cos(theta) * Math.cos(phi);
    let y = Math.sin(theta) * Math.cos(phi);
    let z = Math.sin(phi);
    return [i, x, y, z].concat(normalize([x, y, z]));
}

let uvToTube = (u, v, i) => {
    let theta = 2 * Math.PI * u;
    let x = Math.cos(theta);
    let y = Math.sin(theta);
    let z = 2 * v - 1;
    return [i, x, y, z].concat(normalize([x, y, 0]));
}

let uvToDisk = (u, v, i, dz) => {
    if (dz === undefined)
        dz = 0;
    let theta = 2 * Math.PI * u;
    let x = Math.cos(theta) * v;
    let y = Math.sin(theta) * v;
    let z = dz;
    return [i, x, y, z].concat([0, 0, Math.sign(z)]);
}
let uvToTorus = (u, v, i, r) => {
    let theta = 2 * pi;
    let phi = theta * v;
    theta *= u;
    let x = 1 + r * cos(phi);
    let y = sin(theta) * x;
    x *= cos(theta);
    let z = r * sin(phi);
    let tx = -sin(theta),
        ty = cos(theta),
        tsx = sin(phi),
        tsy = tsx * tx,
        tsz = cos(phi);
    tsx *= -ty;
    return [i, x, y, z].concat(normalize([ty * tsz * 0.5, -tx * tsz, tx * tsy - ty * tsx]));
}

let createCube = (w, h, l, id) => {
    let mesh = [];
    mesh = mesh.concat([id, -w / 2, -h / 2, -l / 2, 0, -1, 0]);
    mesh = mesh.concat([id, -w / 2, -h / 2, l / 2, 0, -1, 0]);
    mesh = mesh.concat([id, w / 2, -h / 2, -l / 2, 0, -1, 0]);
    mesh = mesh.concat([id, w / 2, -h / 2, l / 2, 0, -1, 0]);

    mesh = mesh.concat([id, w / 2, -h / 2, l / 2, 0, -1, 0]);
    mesh = mesh.concat([id, w / 2, -h / 2, l / 2, 0, 0, 1]);

    mesh = mesh.concat([id, w / 2, -h / 2, l / 2, 0, 0, 1]);
    mesh = mesh.concat([id, w / 2, h / 2, l / 2, 0, 0, 1]);
    mesh = mesh.concat([id, -w / 2, -h / 2, l / 2, 0, 0, 1]);
    mesh = mesh.concat([id, -w / 2, h / 2, l / 2, 0, 0, 1]);

    mesh = mesh.concat([id, -w / 2, h / 2, l / 2, 0, 0, 1]);
    mesh = mesh.concat([id, -w / 2, h / 2, l / 2, -1, 0, 0]);

    mesh = mesh.concat([id, -w / 2, h / 2, l / 2, -1, 0, 0]);
    mesh = mesh.concat([id, -w / 2, -h / 2, l / 2, -1, 0, 0]);
    mesh = mesh.concat([id, -w / 2, h / 2, -l / 2, -1, 0, 0]);
    mesh = mesh.concat([id, -w / 2, -h / 2, -l / 2, -1, 0, 0]);

    mesh = mesh.concat([id, -w / 2, -h / 2, -l / 2, -1, 0, 0]);
    mesh = mesh.concat([id, -w / 2, -h / 2, -l / 2, 0, 0, -1]);

    mesh = mesh.concat([id, -w / 2, -h / 2, -l / 2, 0, 0, -1]);
    mesh = mesh.concat([id, -w / 2, h / 2, -l / 2, 0, 0, -1]);
    mesh = mesh.concat([id, w / 2, -h / 2, -l / 2, 0, 0, -1]);
    mesh = mesh.concat([id, w / 2, h / 2, -l / 2, 0, 0, -1]);

    mesh = mesh.concat([id, w / 2, h / 2, -l / 2, 0, 0, -1]);
    mesh = mesh.concat([id, w / 2, h / 2, -l / 2, 1, 0, 0]);

    mesh = mesh.concat([id, w / 2, h / 2, -l / 2, 1, 0, 0]);
    mesh = mesh.concat([id, w / 2, h / 2, l / 2, 1, 0, 0]);
    mesh = mesh.concat([id, w / 2, -h / 2, -l / 2, 1, 0, 0]);
    mesh = mesh.concat([id, w / 2, -h / 2, l / 2, 1, 0, 0]);

    mesh = mesh.concat([id, w / 2, -h / 2, l / 2, 1, 0, 0]);
    mesh = mesh.concat([id, w / 2, h / 2, l / 2, 0, 1, 0]);

    mesh = mesh.concat([id, w / 2, h / 2, l / 2, 0, 1, 0]);
    mesh = mesh.concat([id, w / 2, h / 2, -l / 2, 0, 1, 0]);
    mesh = mesh.concat([id, -w / 2, h / 2, l / 2, 0, 1, 0]);
    mesh = mesh.concat([id, -w / 2, h / 2, -l / 2, 0, 1, 0]);
    return new Float32Array(mesh);
}

function updatePositions() {
    let m = matrix_rotateY(-mousedx);
    m = matrix_multiply(m, matrix_rotateX(-mousedy));
    setUniform('3f', 'V0', m[8] * (fl + mousedz), m[9] * (fl + mousedz), m[10] * (fl + mousedz));
    m = const_multiply((fl + 1 + mousedz) / (fl + 1), m);
    setUniform('Matrix3fv', 'transformation', false, [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
    invTr = matrix_inverse(m);

    positionsupdated = false;
}
function controls_hitTest(pos, clicked = false){
    // let iMin = -1, tMin = 10000.;
    if(channel_disp == 5)
        return;
    canvas_controls.forEach((c, i) => {
        if(c.enabled && c.hitTest && (c.hover||clicked) ){
            let t = c.hitTest(pos);
            if(t != -1){
                if(clicked)
                    c.onClick();
                else
                    c.hover(true);
            }
            else
                if(c.hovering)
                    c.hover(false);
       }
    });
    //ground
    if(ground_m && ground){
        let invG = matrix_inverse(ground_m);
        let P = hitTest_square(pos, invG, ground);
        console.log(P);
        //let Vp = minus(matrix_multiply(invG,[0,0,fl, 1]).slice(0,3), this.origin);
        if(P!=-1)
            if(near_magician){
                if(slider.dragging === true){
                    slider_dl += 10 * (P[0] - slider.lastPos);
                    if(slider_dl < 0) slider_dl = 0;
                    else if (slider_dl > 9) slider_dl = 9;
                    slider.lastPos = P[0];
                    // onUpdate
                    let id = 1 + .45*slider_dl/9;
                    changeID(id, cylinderMesh);
                } else if(clicked) {
                    const PO = minus([slider_dl/10-.25, .7], [P[0], P[1]]);
                    const rr = PO[0]*PO[0] + PO[1] * PO[1];
                    if(rr < .003){
                        slider.dragging = true;
                        slider.lastPos = P[0];
                    }
                }
            } else {
                if(clicked || running<=0)
                {
                    direction_l = [P[0] - delta_l[0]/10, P[1] - delta_l[1]/10];
                    if(P[1] < 0.00000000000001)
                        P[1] = 0.0000000000000001;
                    figure_rot =  atan(direction_l[0]/direction_l[1]);
                    if(direction_l[1] < 0){
                        figure_rot = pi + figure_rot; 
                    }
                }
                //if(figure_rot < 0) figure_rot += pi;
                //updateStatus([figure_rot, direction_l[0]/direction_l[1]]);
                if(clicked)
                {   
                    dir_sdl = vec_len(direction_l)*10;
                    direction_l = normalize(direction_l);
                    rebuild = true;
                    running = 1;
                }
            }
    }
    //return iMin;
}
function hitTest(pos) {

    let m = matrix_rotateY(-mousedx);
    m = matrix_multiply(m, matrix_rotateX(-mousedy));
    let V = [m[8] * (fl + mousedz), m[9] * (fl + mousedz), m[10] * (fl + mousedz)];
    m = const_multiply((fl + 1 + mousedz) / (fl + 1), m);
    let trPos = matrix_multiply([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]], [pos[0], -pos[1], -1], 3, 3);

    let W = normalize(minus(trPos, V));
    let tMin = 10000.;
    let iMin = -1;
    for (let i = 0; i < cns; i++) {
        let Vp = minus(V, matrix_multiply(SphTr[i], Sph[i]));
        let B = dot(W, Vp);
        let C = dot(Vp, Vp) - Sph[i][4] * Sph[i][4];
        let D = B * B - C;
        if (D > 0.) {
            let t = -B - sqrt(D);
            if (t > 0.0 && t < tMin) {
                tMin = t; // This is an optimization, we don't have to do lighting/tex
                iMin = i; // for objects that are occuluded, which is expensive!
            }
        }
    }
    return iMin;
}
let matrix_transform = (m, p) => {
    let x = p[0],
        y = p[1],
        z = p[2],
        w = p[3] === undefined ? 1 : p[3];
    let q = [m[0] * x + m[4] * y + m[8] * z + m[12] * w,
        m[1] * x + m[5] * y + m[9] * z + m[13] * w,
        m[2] * x + m[6] * y + m[10] * z + m[14] * w,
        m[3] * x + m[7] * y + m[11] * z + m[15] * w
    ];
    return p[3] === undefined ? [q[0] / q[3], q[1] / q[3], q[2] / q[3]] : q;
}
let evalSpline = (h, t) => {
    // t *= (h.length - 2) / 2;
    // let n = 2 * Math.floor(t);
    // t = t % 1;
    // let C = matrix_transform(type, [h[n+0],h[n+2],h[n+1],h[n+3]]);
    // return t*t*t*C[0] + t*t*C[1] + t*C[2] + C[3];
    return t * t * t * h[0] + t * t * h[1] + t * h[2] + h[3];
}
let getSurface = (S0, S1, u, v, offsetidx, id = 15, additional_offset = 0) => {
    const epsilon = .001;
    let z0 = evalSpline(S0, v),
        z1 = evalSpline(S0, v + epsilon),

        r0 = evalSpline(S1, v) - path_misc[offsetidx][1] + additional_offset,
        r1 = evalSpline(S1, v + epsilon),

        tilt = Math.atan2(r0 - r1, z1 - z0);

    let xx = cos(2 * pi * u),
        yy = sin(2 * pi * u);
    let x = r0 * xx, // POSITION
        y = r0 * yy,
        z = z0,
        nx = cos(tilt), // NORMAL
        ny = nx * yy,
        nz = sin(tilt);
    nx *= xx;
    return [id, x, y, z, nx, ny, nz];
}
let concat = (a, b) => b.forEach(e => a.push(e));