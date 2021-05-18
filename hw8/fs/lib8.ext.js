let ctrl = false,
   alt = false,
   shift = false,
   fpson = true,
   moving = false,
   over = false, 
   keyhold = false;
let lastClick = undefined;
let animating = true;
let flags = 0x0;
var uTime = 0,
   startTime = Date.now();
let lastTime = Date.now(),
   rotTime = 0;
var lastFrameTime = 0;
let oldDocument;
let fullscreen = false,
   btntoggled = false;
let movescene = true;
let oldparents = {};
var tr, div;
let canvas_originalsize;
let Sph = [];
let SphTr = [];
let SphDletaR = [];
let selected = false,
   selection = -1,
   dragging = false;
let overall_trans = matrix_identity(),
   overall_ground, ground_m = matrix_identity();
var rebuild = true,
   presentation = false,
   sRotation = matrix_identity();
var facing = 1,
   running = 0;
var figure_rot = pi;
let curr_mouse_pos = [-10, -10, -10];
var updateVideoTextures = false;
let show_magic = false;
var slider_dl = 0;
var donut_eaten = false;
let int_fxydL = 0, trace = [];//[x, y, tijp[o'm]]
//schema.height = screen.height * .9;
let channel = 2, channel_disp = -1;
for (let i = 0; i < ns; ++i) {
   SphTr[i] = matrix_identity();
   SphDletaR[i] = 0;
}

function ev_supersample(e) {
   let multiplier = insamp.value;
   let w = parseInt(canvas1.style.width) * multiplier;
   let h = parseInt(canvas1.style.height) * multiplier;
   canvas1.height = h;
   canvas1.width = w;
   gl.viewport(0, 0, w, h);
   //gl.clearRect(0, 0, w, h);
}

function toggleFullscreen(element) {
   if (fullscreen) {
      if (document.exitFullscreen)
         document.exitFullscreen();
      else if (document.webkitExitFullscreen)
         document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen)
         document.mozCancelFullScreen();
      else if (document.msExitFullscreen)
         document.msExitFullscreen();
      fullscreen = false;
      bnfs.innerText = "Fullscreen";
   } else {
      if (element.requestFullscreen)
         element.requestFullscreen();
      else if (element.webkitRequestFullscreen)
         element.webkitRequestFullscreen();
      else if (element.msRequestFullscreen)
         element.msRequestFullscreen();
      fullscreen = true;
      bnfs.innerText = "Exit Fullscreen";
   }
}
bnfs.onclick = function (e) {
   if (e === "no")
   ;
   else
      btntoggled = true;
   if (fullscreen) {
      oldparents[controls].appendChild(controls);
      oldparents[canvas1].appendChild(canvas1);
      canvas1.style.width = canvas_originalsize[0];
      canvas1.style.height = canvas_originalsize[1];
      howitworks.hidden = false;
   } else {
      div = document.createElement("div");
      tr = document.createElement("table").insertRow();
      tr.style.backgroundColor = "white";
      let size = Math.min(screen.availHeight, screen.availWidth);
      canvas_originalsize = [canvas1.style.width, canvas1.style.height, canvas1.width, canvas1.height];
      canvas1.style.height = canvas1.style.width = size;
      howitworks.hidden = true;
      oldparents[controls] = controls.parentNode;
      oldparents[canvas1] = canvas1.parentNode;

      let td1 = tr.insertCell();
      td1.appendChild(canvas1);
      let td2;
      td2 = tr.insertCell();
      td2.style.verticalAlign = "top";
      td2.appendChild(controls);

      div.appendChild(tr);
      document.body.appendChild(div);
   }
   toggleFullscreen(div);
   ev_supersample();
}
mov.onclick = function (_) {
   movescene = !movescene;
   if (!movescene) {
      mov.innerText = "Move Scene";
      mov.style.width = "170px";
   } else {
      mov.innerText = "Move Lighting";
      mov.style.width = "180px";
   }
}
document.addEventListener("webkitfullscreenchange", () => {
   if (!btntoggled && fullscreen) bnfs.onclick("no");
   btntoggled = false;
});
document.addEventListener("fullscreenchange", () => {
   if (!btntoggled && fullscreen) bnfs.onclick("no");
   btntoggled = false;
});
clrsel.onclick = function (_) {
   setUniform("1i", "sel", -1);
   selected = false;
   selection = -1;
}
reset.onclick = function (_) {
   clrsel.onclick();
   if (!animating)
      pause_resume();
   flags = 0;
   moving = false;
   donut_eaten = false;
   //slider_dl = 0;
   mousedx = mousedy = mousedz = 0;
   positionsupdated = true;
   for (let i = 0; i < ns; ++i) {
      SphTr[i] = matrix_identity();
      SphDletaR[i] = 0;
   }
   sRotation = matrix_identity();
   startTime = lastTime = Date.now();
   uTime = rotTime = 0;
   delta_l = [0, 0];
   facing = 1;
   rtx.src = './RTXoff.svg';
   setUniform('1i', 'flags', flags);
}
bns.onclick = function (e) {
   if (ins.value > 0 && ins.value <= ns && cns != ins.value) {
      cns = ins.value;
      fragmentShaderDefs = '\n const int cns = ' + cns + ';';
      if (typeof canvas1.setShaders === "function")
         canvas1.setShaders(vs, editor.getSession().getValue());
   }
}
bnsamp.onclick = ev_supersample;
// SET UP THE EDITABLE TEXT AREA ON THE LEFT SIDE.
ace.require("ace/ext/language_tools");
var editor = ace.edit("ace", {
   mode: "ace/mode/glsl",
   theme: "ace/theme/crimson_editor"
});
editor.setOptions({
   enableBasicAutocompletion: true,
   enableSnippets: true,
   enableLiveAutocompletion: true,
   fontSize: 14,
   fontFamily: "monaco, menlo, ubuntu mono, consolas, source-code-pro",
   fixedWidthGutter: true,
   showGutter: true,
   showPrintMargin: false,
});
editor.setAutoScrollEditorIntoView(true);
if (fs != undefined)
   editor.getSession().setValue(fs);
editor.session.on('change', function (delta) {
   if (typeof canvas1.setShaders === "function") {
      canvas1.setShaders(vs, editor.getSession().getValue());
      setUniform('1i', 'flags', flags);
   }
});
// REPARSE THE SHADER PROGRAM AFTER EVERY KEYSTROKE.
delete editor.KeyBinding;
let ttt = -1
let pause_resume = function () {
   ttt += .1;
   if (animating)
      lastTime = Date.now();
   else
      startTime += Date.now() - lastTime;
   animating = !animating;
};
canvas1.addEventListener('click', function (ev) {
   if (!(shift && alt) && lastClick && Date.now() - lastClick < 200)
      pause_resume();
   lastClick = Date.now();
});
pause.onclick = pause_resume;
canvas1.addEventListener('mouseover', function (e) {
   over = true;
   if (e.offsetX > 0 && e.offsetY > 0)
   {
      curr_mouse_pos = [2 * e.offsetX / parseInt(canvas1.style.width) - 1,
         1 - 2 * e.offsetY / parseInt(canvas1.style.height), 0
      ];
      controls_hitTest(curr_mouse_pos);
   }
   else over = false;
});
canvas1.addEventListener('mousedown', function (e) {
   moving = true;
   rotTime = uTime;
   presentation = false;
   mouselastX = mouselastY = undefined;
   controls_hitTest(curr_mouse_pos, true);
});
canvas1.addEventListener('mousemove', function (e) {
   curr_mouse_pos = [2 * e.offsetX / parseInt(canvas1.style.width) - 1,
      1 - 2 * e.offsetY / parseInt(canvas1.style.height), 0
   ];
   controls_hitTest(curr_mouse_pos);
   let dx, dy;
   if(!(mouselastX == undefined || mouselastY == undefined)){
      dx = (mouselastX - e.offsetX),
      dy = (mouselastY - e.offsetY);
      int_fxydL += sqrt(dx*dx + dy*dy);
      if(int_fxydL > 20)
      {
         int_fxydL = 0;
         trace.push([curr_mouse_pos[0], curr_mouse_pos[1], 1]);
      }
   }

   if (!(mouselastX == undefined || mouselastY == undefined) && moving && !near_magician) {
      if (movescene) {
         sRotation = matrix_multiply(sRotation, matrix_rotateY(-dy / 60));
         sRotation = matrix_multiply(sRotation, matrix_rotateX(-dx / 60));
      } else if (!selected) {
         mousedx -= dx / 60;
         mousedy -= dy / 60;
         positionsupdated = true;
      } else if (dragging) {
         let m = matrix_rotateY(-mousedx);
         m = matrix_multiply(m, matrix_rotateX(-mousedy));
         let dv = matrix_multiply(m, [2 * -dx / parseInt(canvas1.style.width),
            2 * dy / parseInt(canvas1.style.height), 0, 1
         ]).slice(0, 3);
         SphTr[selection] = matrix_multiply(SphTr[selection], matrix_translate(dv[0], dv[1], dv[2]));
      }
   }
   mouselastX = e.offsetX;
   mouselastY = e.offsetY;
});
canvas1.addEventListener('mouseup', function (e) {
   moving = false;
   dragging = false;
   slider.dragging = false;
});
canvas1.addEventListener('mouseout', function (e) {
   const mask = 0x8;
   flags &= !mask;
   setUniform('1i', 'flags', flags);
   over = false;
   moving = false;
});
canvas1.addEventListener('wheel', function (e) {
   if (!selected) {
      mousedz += e.wheelDelta / 600;
      positionsupdated = true;
   } else {
      SphDletaR[selection] += e.wheelDelta / 800;
   }
});
canvas1.scroll(function (e) {
   e.stopPropagation();
});
rtx.style.cursor = "pointer";
let rtswitch = function () {
   if(channel_disp != 4){
      channel = 4
      rtx.src = './RTXon.svg';
   }
   else {
      channel = 2;
      rtx.src = './RTXoff.svg';
   }
}
rtx.addEventListener('click', rtswitch);
var requestAnimationFrame = window.requestAnimationFrame ||
   window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
let fpscounter = function (time) {
   if (start === undefined)
      start = time;
   else
      fps.innerHTML = Math.round(10000 / (time - start)) / 10 + ' fps';
   start = time;
   if (fpson)
   ; //requestAnimationFrame(fpscounter);
   else {
      start = undefined;
      fps.innerHTML = '';
   }
};
document.addEventListener('keydown', (e) => {
   if (e.code.startsWith('Shift'))
      shift = true;
   if (e.code.startsWith('Control'))
      ctrl = true;
   if (e.code.startsWith('Alt'))
      alt = true;
   else if (ctrl && alt && e.code == 'KeyT') {
      const mask = 0x1;
      flags = flags & !mask | (!(flags & mask) ? mask : 0);
      setUniform('1i', 'flags', flags);
   } else if (ctrl && e.code == 'KeyS') {
      let a = document.createElement('a');
      a.href = "data:text/plain," + encodeURIComponent(editor.getSession().getValue());
      a.download = 'shader.frag';
      a.click();
   } else if (ctrl && alt && e.code == 'KeyR')
      rtswitch();
   else if (ctrl && alt && e.code == 'KeyN') {
      reset.onclick();
   } else if (ctrl && alt && e.code == 'KeyP')
      pause_resume();
   else if (ctrl && alt && e.code == 'KeyF')
      if (!fpson) {
         fpson = true;
         requestAnimationFrame(fpscounter);
      }
   else
      fpson = false;

   if (e.code == 'ArrowUp' || e.code == 'ArrowDown' || e.code == 'ArrowLeft' ||
      e.code == 'ArrowRight' || e.code == 'KeyW' || e.code == 'KeyS') {
      let oldfacing = facing;
      switch (e.code) {
         case 'ArrowUp':
            facing = -2;
            break;
         case 'ArrowDown':
            facing = 2;
            break;
         case 'ArrowLeft':
            facing = -1;
            break;
         case 'ArrowRight':
            facing = 1;
            break;
         case 'KeyW':
            break;
         case 'KeyS':
            break;
      }
      if(facing !=2)
         figure_rot = (pi*(facing/2));
      else figure_rot = 0;
      if(!keyhold || oldfacing != facing)
      {
         running = 20;
         dir_sdl = 0;
         keyhold = true;
      }
      else 
         running = running > 5? running:5;
      rebuild = true;
   }
   if (fullscreen && selected) {
      if (e.code == 'KeyF' || e.code == 'KeyB') {
         let m = matrix_rotateY(-mousedx);
         m = matrix_multiply(m, matrix_rotateX(-mousedy));
         m = const_multiply((fl + 1 + mousedz) / (fl + 1), m);

         switch (e.code) {
            case 'KeyB':
               var dv = matrix_multiply(m, [0, 0, -0.1, 1]).slice(0, 3);
               m = matrix_translate(dv[0], dv[1], dv[2]);
               break;
            case 'KeyF':
               var dv = matrix_multiply(m, [0, 0, 0.1, 1]).slice(0, 3);
               m = matrix_translate(dv[0], dv[1], dv[2]);
               break;
         }
         SphTr[selection] = matrix_multiply(SphTr[selection], m);
      }

   }
});

document.addEventListener('keyup', (e) => {
   keyhold = false;
   if (e.code.startsWith('Control'))
      ctrl = false;
   if (e.code.startsWith('Alt'))
      alt = false;
   if (e.code.startsWith('Shift'))
      shift = false;
});
let squareMesh = (w = 1, h = 1, dir = 1, id = -1)=> new Float32Array([id, -w, h, 0, 0, 0, dir, id, w, h, 0, 0, 0, dir, id, -w, -h, 0, 0, 0, dir, id, w, -h, 0, 0, 0, dir]);
let sphereMesh = createMesh(8, 8, uvToSphere, 0, 16.45);
let sphereMesh25 = createMesh(25, 25, uvToSphere, 0, 16.45);
let tubeMesh = createMesh(64, 2, uvToTube, 0, 1);
let diskMesh = createMesh(16, 2, uvToDisk, 0, 1);
let tubeMesh2 = createMesh(16, 2, uvToTube, 0, 2);
let diskNMesh2 = createMesh(16, 2, uvToDisk, -1, 2);
let diskPMesh2 = createMesh(16, 2, uvToDisk, 1, 2);
let tubeMesh3 = createMesh(16, 2, uvToTube, 0, 3);
let diskNMesh3 = createMesh(16, 2, uvToDisk, -1, 3);
let diskPMesh3 = createMesh(16, 2, uvToDisk, 1, 3);
let diskNMesh = createMesh(16, 2, uvToDisk, -1, 1);
let diskPMesh = createMesh(16, 2, uvToDisk, 1, 1);
let cylinderMesh = glueMeshes(glueMeshes(tubeMesh, diskPMesh), diskNMesh);
let cylinderMesh2 = glueMeshes(glueMeshes(tubeMesh2, diskPMesh2), diskNMesh2);
let cylinderMesh3 = glueMeshes(glueMeshes(tubeMesh3, diskPMesh3), diskNMesh3);
let torusMash = createMesh(32, 32, uvToTorus, 1, 18);
let head = createCube(1.5, 1, 1, 4);

let objects = [];
let addObject = (obj, mat) => {
   objects.push([obj, mat]);
};
let clearObject = () => {
   delete objects;
   objects = [];
};
let delta_height = 0,
   delta_l = [0, 0];
var direction_l = [0, 0], dir_sdl = 0;
class State {
   constructor() {
      this.leg = true;
      this.progress = 0;
      this.rh = this.lh = .5 * pi;
      this.lf = this.rf = 0;
   }
   initialize() {
      this.leg = true;
      this.progress = 0;
   }
   next() {
      //return this.presentation();
      if (running <= 0)
         return {
            rh: .5 * pi,
            lh: .5 * pi,
            rf: 0,
            lf: 0,
            dh: 0,
            dl: 0
         }
      running--;
      const steps = 28;
      let dl = 0;
      if (this.progress >= steps / 2) {
         this.progress = 0;
         this.leg = !this.leg;
      }
      let delta = [-.7*pi , 0.5 * pi, 0.44 * pi, 0.55 * pi];
      for (let i = 0; i < 4; ++i) delta[i] /= steps;
      if (this.leg) {
         if (this.progress < steps / 4) {
            this.lh += delta[0];
            this.rh += delta[3];
            this.lf += delta[1];
            this.rf += delta[2];
         } else {
            this.lh -= delta[0];
            this.rh -= delta[3];
            this.lf -= delta[1];
            this.rf -= delta[2];
         }
      } else {
         if (this.progress < steps / 4) {
            this.lh += delta[3];
            this.rh += delta[0];
            this.lf += delta[2];
            this.rf += delta[1];
         } else {
            this.lh -= delta[3];
            this.rh -= delta[0];
            this.lf -= delta[2];
            this.rf -= delta[1];
         }
      }
      let delta_h = Math.max((1 - cos(abs(this.lh - pi / 2))) * .5 + (1 - cos(abs(this.lf))) * .6, (1 - cos(abs(this.rh - pi / 2))) * .5 + (1 - cos(abs(this.rf))) * .6);
      this.progress++;
      return {
         lh: this.lh,
         lf: this.lf,
         rh: this.rh,
         rf: this.rf,
         dh: delta_h,
         dl: 1.8522 / steps
      };
   }
   // presentation(){
   //    return {lh:.4*pi, lf:pi/6,rh:.7*pi, rf:pi/8, dh:0};
   // }
};

let star1 = [],
   star = [];
let sakura = [],
   stars = [],
   nstars = 25;
let star2 = [],
   newstar, star4;
const curvex = matrix_multiply(hermiteMat, [-.3, .8, .6, .5]);
const curvey = matrix_multiply(hermiteMat, [-.2, .5, .7, .2]);
const curvez = matrix_multiply(hermiteMat, [-.5, .2, .3, .8]);
let adt = [];
var near_magician = false;
let build_objects = (state) => {
   if (running === 0)
      rebuild = false;
   let {
      lh,
      lf,
      rh,
      rf,
      dh,
      dl
   } = state.next();
   if(dir_sdl > 0){
      delta_l = plus(delta_l, const_multiply(dl, direction_l));
      dir_sdl -= dl;
      running = 1;
   }else
      delta_l[abs(facing) - 1] += Math.sign(facing) * dl;
   let sqlen = (a, b) => { return a*a + b*b; }
   if(sqlen(delta_l[0] - 8, delta_l[1] + 6)< 6)
   {
      if(!near_magician){
         near_magician = true;
         movescene = false;
         button_magic.enabled = true;
         pushStatus('Show me some magic');
         changeID(14, ground);
      }
   } else if(near_magician) {
      restoreStatus();
      changeID(-1, ground);
      near_magician = false;movescene = true;button_magic.enabled = false;
   } else if(!donut_eaten && sqlen(delta_l[0] - 6, delta_l[1] - 6) < 5){
      donut_eaten = true;
      pushStatus('Yum');
   }
   delta_height = dh;
   clearObject();
   M.save();

   M.translate(0, 1, 0);
   addObject(head, M.value());
   M.restore();
   M.save();
   M.translate(0.5, 0.2, 0.3);
   M.rotateX(pi / 4);
   M.translate(0, 0, .5);
   M.save();
   M.translate(0, 0, .4);
   M.rotateX(-0.53 * pi);
   M.scale(0.2, 0.2, 0.4);
   M.translate(0, 0, 1);
   addObject(cylinderMesh2, M.value());
   M.restore();
   M.scale(0.2, 0.2, 0.5);
   addObject(cylinderMesh2, M.value());
   M.restore();
   M.save();
   M.translate(-0.5, 0.2, 0.3);
   M.rotateX(pi / 4);
   M.translate(0, 0, .5);
   M.save();
   M.translate(0, 0, .4);
   M.rotateX(-0.55 * pi);
   M.scale(0.2, 0.2, 0.4);
   M.translate(0, 0, 1);
   addObject(cylinderMesh2, M.value());
   M.restore();
   M.scale(0.2, 0.2, 0.5);
   addObject(cylinderMesh2, M.value());
   M.restore();
   M.save();
   M.translate(0.3, -1, 0.);
   M.rotateX(lh);
   M.translate(0, 0, .5);
   M.save();
   M.translate(0, 0, .45);
   M.rotateX(lf);
   M.scale(0.2, 0.2, 0.6);
   M.translate(0, 0, 1);
   addObject(cylinderMesh3, M.value());
   M.restore();
   M.scale(0.2, 0.2, 0.5);
   addObject(cylinderMesh3, M.value());
   M.restore();
   M.save();
   M.translate(-0.3, -1, 0.);
   M.rotateX(rh);
   M.translate(0, 0, .5);
   M.save();
   M.translate(0, 0, .45);
   M.rotateX(rf);
   M.scale(0.2, 0.2, 0.6);
   M.translate(0, 0, 1);
   addObject(cylinderMesh3, M.value());
   M.restore();
   M.scale(0.2, 0.2, 0.5);
   addObject(cylinderMesh3, M.value());
   M.restore();
   M.save();
   M.rotateX(pi / 2);
   M.scale(0.5, 0.5, 1);
   addObject(cylinderMesh, M.value());
   M.restore();
   M.save();
   M.restore();
   if (running < 0)
      rebuild = false;
};

let build_splines = () => {
   star = [], star1 = [], star2 = [], star4 = [], newstar = [], adt = [], sakura = [];
   var n = 11,
      innerN = Math.ceil((paths[0].length * n) / paths[1].length);
   for (let j = 0; j < paths[0].length; ++j) {
      let xf = paths[0][j][0],
         yf = paths[0][j][1];
      for (var k = 0; k <= n; ++k) {
         let t = k / n;
         star1.push([7, dot(xf, [t * t * t, t * t, t, 1]),
            dot(yf, [t * t * t, t * t, t, 1]),
            0, 0, 0, 1
         ]);
      }
   }

   for (let j = 13; j >= 0; j--) {
      let xf = paths[1][j][0],
         yf = paths[1][j][1];
      for (var k = innerN - 1; k >= 0; --k) {
         let t = k / (innerN - 1);
         star2.push([7, dot(xf, [t * t * t, t * t, t, 1]),
            dot(yf, [t * t * t, t * t, t, 1]),
            0, 0, 0, 1
         ]);
      }
   }
   for (let j = paths[1].length - 1; j > 12; --j) {
      let xf = paths[1][j][0],
         yf = paths[1][j][1];
      for (var k = innerN; k >= 0; --k) {
         let t = k / innerN;
         star2.push([7, dot(xf, [t * t * t, t * t, t, 1]),
            dot(yf, [t * t * t, t * t, t, 1]),
            0, 0, 0, 1
         ]);
      }
   }
   for (let i = 0; i < star1.length; ++i) {
      concat(star, star1[i]);
      concat(star, star2[i]);
   }
   n = 25;
   for (let l = 2; l < 6; ++l) {
      adt[l - 2] = [];
      for (let j = 0; j < paths[l].length; ++j) {
         let xf = paths[l][j][0],
            yf = paths[l][j][1];
         for (var k = 0; k <= n; ++k) {
            let t = k / n;
            adt[l - 2].push(10 + l, dot(xf, [t * t * t, t * t, t, 1]),
               -dot(yf, [t * t * t, t * t, t, 1]),
               0, 0, 0, 1);
         }
      }
   }
   n = 20;
   for (let l = 6; l < 13; ++l) {
      sakura[l - 6] = [];
      for (let j = 0; j < paths[l].length; ++j) {
         let xf = paths[l][j][0],
            yf = paths[l][j][1];
         for (var k = 0; k <= n; ++k) {
            let t = k / n;
            sakura[l - 6].push(10, dot(xf, [t * t * t, t * t, t, 1]),
               dot(yf, [t * t * t, t * t, t, 1]),
               0, 0, 0, 1);
         }
      }
   }
   star4 = star.slice();
   newstar = star.slice()
   for (let i = 0; i < star.length; i += 7) {
      star4[i] = 9;
      newstar[i] = 8;
   }
   for (let i = 0; i < nstars; ++i) {
      stars.push(star.slice());
      startz.push(.6 * Math.random());
      random_rot.push(0);
      random_rot_pos.push(0);
   }
   return false;
}
let state = new State();
var M = new Matrix();
var buildsplines = true;
let magician = false,
   magician_neck = false,
   magician_houki = false,
   body = false,
   leg = false,
   hand = false;
let sa2 = [
      1.6, 0.4, .9, 1., .3, .2, -.4, .8,
      -.8, -.1, -1.4, .5, -1.6, -.5
   ],
   fsa2 = [
      [matrix_multiply(bezierMat, [sa2[0], sa2[2], sa2[4], sa2[6]]),
         matrix_multiply(bezierMat, [sa2[1], sa2[3], sa2[5], sa2[7]])
      ],
      [matrix_multiply(bezierMat, [sa2[6], sa2[8], sa2[10], sa2[12]]),
         matrix_multiply(bezierMat, [sa2[7], sa2[9], sa2[11], sa2[13]])
      ]
   ],
   random_rot = [0, 0, 0, 0, 0, 0, 0],
   random_rot_pos = [0, 0, 0, 0, 0, 0, 0],
   startz = [];

let division = -1;
let changeID = (id, obj) => {
   for (let i = 0; i < obj.length; i += 7) obj[i] = id;
}

let rtx_update = () => {
   Sph[0] = [0,0.05*Math.cos(uTime + 1.),.045*Math.cos(uTime), 1,.15];
   Sph[1] = [0,0,0,1,.25];
   Sph[2] = [.22*Math.sin(uTime*1.2),0.05,.22*Math.cos(uTime*1.2),1,.05];
   Sph[3] = [.9*Math.sin(uTime*.4),0.,.9*Math.cos(uTime*.4),1,.25];
   Sph[4] = [0.5*Math.sin(uTime*1.),0.08*Math.sin(uTime *0.9),.5*Math.cos(uTime*1.),1,.12];

   for(let i = 0; i < ns; ++ i)
   {
      let trsph = matrix_multiply(SphTr[i], Sph[i]);
      trsph[3] = Sph[i][4];
      setUniform('4fv', 'Sph['+ i + ']', trsph);
   }
}
let draw_magician = (gl) => {
   magician = magician ? magician : createMeshFromSpline(13, 32, 4, 4, 0, (i, _, oid) => {
      if (oid == 4 && i == 10) return 3;
      else if (oid == 3 && i == 16) return 2;
      else if (oid == 2 && i == 23) return 1;
   });
   magician_neck = magician_neck ? magician_neck : createMeshFromSpline(14, 32, 4, 5, -.2);
   magician_houki = magician_houki ? magician_houki : createMeshFromSpline(15, 32, 4, 6);
   body = body ? body : createMeshFromSpline(16, 32, 4, 7, 0, (i, tmp) => {
      if (division < 0 && i == 25) division = tmp.length;
   });
   leg = leg ? leg : createMeshFromSpline(17, 32, 4, 8);
   hand = hand ? hand : createMeshFromSpline(18, 32, 4, 9, .015);

   M.save();
   M.scale(0.6);
   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(body.slice(0, division));
   drawMesh(body.slice(division - 7), gl.LINE_LOOP);
   M.save();
   M.translate(0, 0, -1.05);
   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(magician);
   M.restore();
   M.save();
   M.translate(0, 0, -.53);
   M.scale(.1);
   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(magician_neck);
   M.restore();
   M.save();
   M.translate(-1, 0, 0);
   M.scale(2);
   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(magician_houki);
   M.restore();
   M.save();
   M.translate(-.06, 0, .85);
   M.rotateY(0.02);
   M.scale(1.2);
   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(leg);
   M.restore();
   M.save();
   M.translate(.06, 0, .85);
   M.rotateY(-0.02);
   M.scale(1.2);
   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(leg);
   M.restore();
   M.save();
   M.translate(-.35, 0, -.1);
   M.rotateY(-pi / 6);
   M.scale(.82);
   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(hand);
   M.restore();
   M.save();
   M.translate(.35, 0, -.1);
   M.rotateY(pi / 6);
   M.scale(.82);
   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(hand);
   M.restore();
   M.restore();
}
let draw_deco = (gl) => {

   // M.save();
   //    M.rotateZ((uTime));
   //    setM(M.value());
   //    drawMesh(new Float32Array(star));
   // M.restore();


   // M.save();
   //    M.scale(0.1);
   //    M.translate(6,0,1);
   //    M.rotateX(1);
   //    M.rotateY(uTime/4);
   //    setM(M.value());
   //    drawMesh(torusMash,gl.LINES);
   // M.restore();

   M.save();
   M.translate(-.7,.75,0);
   //M.rotateZ(pi);
   M.scale(0.6)
   setM(M.value());

   for(let l = 2; l < 6; ++l)
      drawMesh(new Float32Array(adt[l-2]),gl.LINE_LOOP);
   M.restore();
   
   M.save();
   // M.scale(sin(uTime/2));
   M.translate(-.23, .7, 0);

   M.rotateZ(sin(uTime/6) + 0.2);
   M.scale(0.4);
      for(let i = 0; i < 10; i++){
         M.scale(0.995);
         M.save();
         setM(M.value());
         M.restore();
         for(let l = 8; l < 13; ++l)
            drawMesh(new Float32Array(sakura[l-8]),gl.LINE_LOOP);
      }
   M.restore();
   M.save();
   M.translate(0.2, .7, 0);

   M.rotateZ(sin(uTime/6) + 0.2);
   M.scale(0.4);
      for(let i = 0; i < 10; i++){
         M.scale(0.995);
         M.save();
         setM(M.value());
         M.restore();
         for(let l = 8; l < 13; ++l)
            drawMesh(new Float32Array(sakura[l-8]),gl.LINE_LOOP);
      }
   M.restore();
   M.save();
   M.translate(.7, .7, 0);
   M.rotateZ(sin(uTime/6) + 0.2);
   M.scale(0.6);
      for(let i = 0; i < 10; i++){
         M.scale(0.995);
         M.save();
         setM(M.value());
         M.restore();
         for(let l = 8; l < 13; ++l)
            drawMesh(new Float32Array(sakura[l-8]),gl.LINE_LOOP);
      }
   M.restore()
}
let tv;
let make_tv = ()=>{
   let screen = squareMesh(1,.5625, 1, -2), scrtr;
   let stand = tubeMesh.slice(), standtr;
   let base = cylinderMesh.slice(), basetr;
   
   changeID(17, stand);
   changeID(17, base);
   M.save();
   M.translate(0,0,-5.3);
   M.rotateX(pi/2);
   M.scale(8);
   scrtr = M.value();
   M.restore();
   M.save();
   M.scale(.07, .07 ,.9);
   standtr = M.value();
   M.restore();

   M.save();
   M.translate(0,0,.9)
   M.scale(1.7, 1.7 ,.03);
   basetr = M.value()
   M.restore();
   tv = [[screen, scrtr], [stand, standtr], [base,basetr]];
}
let touch_screen;
let shader1_inited = false;
let draw_tv = (gl) => {
   if(!tv) make_tv();
   if(!touch_screen) {
      touch_screen = new Button(()=>{
         if(channel_disp == 4){   
            let i = hitTest(touch_screen.P);
            if (i >= 0) {
               dragging = true;
               selected = true;
               selection = i;
            } else if (selected = true) {
               dragging = false;
               selected = false;
               selection = i;
            }
         }
      }, tv[0][0], 'square');
      touch_screen.hover = (e)=>{ movescene = (e&&channel_disp == 4)?false:true;touch_screen.hovering =!movescene;};
   }
   M.save();
   M.translate(-3, -2.2, -6);
   M.rotateY(.6);
   M.rotateX(pi/2);
   tv.forEach((obj, i) => {
      let m = matrix_multiply(sRotation, matrix_multiply(overall_ground,matrix_multiply(M.value(),obj[1])));
      if(i == 0)
         touch_screen.updateMatrix(m);
      if(channel_disp == 4 && i == 0){
         gl.useProgram(gl.shaders[1]);
         gl.program = gl.shaders[1];
         setM(m);
         if(positionsupdated)
            updatePositions();
         setUniform('1f', 'uTime', uTime);
         if(selection >= 0)
            setUniform("1i", "sel", selection);
         else 
            setUniform("1i", "sel", -1);

         var offset = 0;
         let attribs = [
            .05,.05,.1,  .5,.5,1.,  1.,.5,.5,20.,  0., .0, 1.3,
            .1,.05,.05,  1.,.5,.5,  1.,.5,.5,10.,  .3,1.,1.3,
            .1,.05,.05,  .71,.71,.71,  .71,.71,.71,10.,  0.3,.0,1.5,
            .1,.1,.1,  .71,.71,.71,  .71,.71,.71,10.,  0.05,0., 1.,
            .0,.0,.0,  .0,.0,.0,  .0,.0,.0,40.,  0.,.85,1.5
         ]
         for(let i = 0; i < ns; i++){
            setUniform('3fv', 'Ambient['+i+']', attribs.slice(offset, offset += 3));
            setUniform('3fv', 'Diffuse['+i+']', attribs.slice(offset, offset += 3));
            setUniform('4fv', 'Specular['+i+']', attribs.slice(offset, offset += 4));
            setUniform('1fv', 'ks['+i+']', attribs.slice(offset, offset += 1));
            setUniform('1fv', 'kr['+i+']', attribs.slice(offset, offset += 1));
            setUniform('1fv', 'kf['+i+']', attribs.slice(offset, offset += 1));
         }

         Sph[0] = [0,0.05*Math.cos(uTime + 1.),.045*Math.cos(uTime), 1,.15];
         Sph[1] = [0,0,0,1,.25];
         Sph[2] = [.22*Math.sin(uTime*1.2),0.05,.22*Math.cos(uTime*1.2),1,.05];
         Sph[3] = [.9*Math.sin(uTime*.4),0.,.9*Math.cos(uTime*.4),1,.25];
         Sph[4] = [0.5*Math.sin(uTime*1.),0.08*Math.sin(uTime *0.9),.5*Math.cos(uTime*1.),1,.12];
         if(!shader1_inited){
            initTextures(gl, gl.program);
            shader1_inited = true;
         }
         for(let i = 0; i < ns + 2; ++ i){
            textures[i] = i;
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, texture[i]);
         }
         gl.uniform1iv(gl.getUniformLocation(gl.shaders[1], 'uSampler'), textures);
         
         for(let i = 0; i < ns; ++ i)
         {
            let trsph = matrix_multiply(SphTr[i], Sph[i]);
            trsph[3] = Sph[i][4];
            setUniform('4fv', 'Sph['+ i + ']', trsph);
         }
         drawMesh(obj[0]);
         gl.useProgram(gl.shaders[0]);
         gl.program = gl.shaders[0];
      }
      else
      {
         setM(m);
         //for(let i = 0; i < ns + 2; ++ i){
         //   textures[i] = i;
         //   gl.activeTexture(gl.TEXTURE0 + i);
         //   gl.bindTexture(gl.TEXTURE_2D, texture[i]);
         //}
         //gl.uniform1iv(gl.getUniformLocation(gl.shaders[1], 'uSampler'), textures);
         
         drawMesh(obj[0]);
      }
   });
   M.restore();
}
let tv_ctrl = new Button(()=>{channel = 2;});
let tv_ctrl1 = new Button(()=>{channel = 3;});
let tv_ctrl2 = new Button(()=>{channel = 4;});

var ground = squareMesh();
let trace_star;
let drawTrace = (gl)=>{
   if(!trace_star) trace_star = new Float32Array(star);
   let newtrace = [];
   trace.forEach((tr, _)=>{
      M.save();
         M.translate(tr[0], tr[1], 0);
         M.scale(tr[2]*.07);
         const newid = 16 + (1-pow(10, tr[2])/10)*.5
         for(let i = 0; i < trace_star.length; i += 7)
            trace_star[i] = newid;
         setM(M.value());
         drawMesh(trace_star);
      M.restore();
      tr[2] -= .05;
      if(tr[2] > 0)
         newtrace.push(tr);
   });
   trace = newtrace;
}
function setTVCtrl() {
   
   let setup_control = (control, str, id) =>{
      control.resetShape(sphereMesh);
      changeID(id +.15, control.getShape());
      control.hover = (e = true) =>{
         if(e){
            if(status_history.len <= 2)
               pushStatus(str); 
            else updateStatus(str);
            control.hovering = true;
            changeID(id, control.getShape());
         } else {
            restoreStatus();
            changeID(id + .15, control.getShape());
            control.hovering = false;
         }
      }
   }
   setup_control(tv_ctrl, 'Turn TV OFF.', 8);
   setup_control(tv_ctrl1, 'Play a Video.', 9);
   setup_control(tv_ctrl2, 'Show Ray Tracing.', 10);
}
let drawstars = ()=>{  
    for (let i = 0; i < nstars; ++i) {
      M.save()
      let f_idx = (uTime / (abs(sin(i * 1234)) * 8 + 10)) % 2,
         t = f_idx - Math.floor(f_idx);
      f_idx -= t;
      let curr_mat = [t * t * t, t * t, t, 1];
      M.translate(1.2 * sin(sin(uTime / (i + 2) + i + 8) * .9 + dot(fsa2[f_idx][0], curr_mat) * 5 + startz[Math.floor(2 * startz[i] * nstars) % nstars]), 1.2 * cos(i + sin(uTime / (i / 2 + 18) + 12) * .1 + startz[nstars - i - 1] + dot(fsa2[f_idx][1], curr_mat) * startz[(nstars + i) % nstars] * .4 + i * sin(random_rot_pos[i] / 30) / pi), .65 * startz[i] + .3 * sin(random_rot_pos[i] / 20));
      let epsilon = 1 / (i * 2 + 20);
      let random = () => {
         var u = 0,
            v = 0;
         while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
         while (v === 0) v = Math.random();
         return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) / pi;
      }
      if ((window.performance.now() + i * (2 + abs(random()))) % 69 < 2) {
         changeID(Math.ceil(Math.random() * 20) - 5, stars[i])
      }
      random_rot[i] += random() * epsilon;
      random_rot_pos[i] += .5 + abs(random()) / (pi + i);
      //setM(M.value);
      M.rotateZ(sin(random_rot_pos[i] / 10) * pi);
      M.rotateX(.1 * sin(random_rot_pos[i] / (i + 50)) * pi);
      M.rotateY(.1 * sin(random_rot_pos[i] / (i * 2 + 50)) * pi);

      M.scale(0.2 + startz[i] * .2);
      setM(M.value());
      drawMesh(new Float32Array(stars[i]));
      M.restore();
   }
}
let slider, slider_body, button_magic = new Button(()=>{
   show_magic = !show_magic;
   if(show_magic)
      changeID(4.1, button_magic.shape);
   else 
      changeID(16.15, button_magic.shape);
});
let make_slider = () => {
   slider = createCube(9,.05,.05,12);
   slider_body = createCube(.4,.14,.7,12);
   button_magic.resetShape(sphereMesh25);
   button_magic.hover=(e) => {
      id = button_magic.shape[0];
      if(id < 5)
         id = e?4.1:4.2;
      else 
         id = e?16.15:16.45;
      if(e){
         if(!button_magic.hovering){
            changeID(id, button_magic.shape);
            button_magic.hovering = true;
         }
      } else 
      {
         if(button_magic.hovering){
            changeID(id, button_magic.shape);
            button_magic.hovering = false;
         }
      }
   };
   if(!near_magician)
      button_magic.enabled = false;
};
let draw_slider = ()=>{
   if(isNaN(slider_dl))
      slider_dl = 0;
   M.save();
      M.translate(2, -3, 7);
      setM(matrix_multiply(sRotation,matrix_multiply(overall_ground,M.value())));
      drawMesh(slider);
   M.restore();
   M.save();
      M.translate(-2.5 + slider_dl, -3, 7);
      setM(matrix_multiply(sRotation,matrix_multiply(overall_ground,M.value())));
      drawMesh(slider_body);
   M.restore();
   M.save();
      M.translate(-6, -3, 7);
      button_magic.updateMatrix(matrix_multiply(sRotation,matrix_multiply(overall_ground,M.value())));
      button_magic.draw();
   M.restore();
};
function animate(gl) {
   buildsplines &&= build_splines() || setTVCtrl();
   if (animating) {
      uTime = (Date.now() - startTime) / 1000;
   } else {
      uTime = (lastTime - startTime) / 1000;
      //setUniform('1f', 'uTime', uTime);
   }
   gl.enable(gl.DEPTH_TEST);

   M.save();
      M.scale(0.1);
      M.rotateX(.6);
      M.rotateZ(.35);
      overall_ground = M.value();

      M.translate(delta_l[0], -delta_height, delta_l[1]);

      M.rotateY(figure_rot);
      overall_trans = M.value();
   M.restore();
   


   M.save();

   M.translate(0,-3.155,0);
   M.rotateX(pi/2);
   M.scale(10);

   ground_m = matrix_multiply(sRotation,matrix_multiply(overall_ground,M.value()));
   setM(ground_m);
   drawMesh(ground);
   M.restore();


   if(updateVideoTextures){
      updateVideoTexture(gl, pjsk, ns + 0);
   }
   M.save();
   M.translate(8, -.5, -6);
   M.scale(3);
   M.applyl(overall_ground);
   M.rotateX(pi/2)
   draw_magician(gl);
   M.restore();
   draw_tv(gl);
   // M.save();
   // M.translate(-.7, .7, 0);
   // M.scale(.3);
  // draw_deco(gl);
   // M.restore();
   // setM(M.value());
   // test = new Float32Array([10, -1,-1,ttt,0,0,0,10,1,1,ttt,0,0,0]);
   // drawMesh(test, gl.LINES);
   if(channel != channel_disp){
      channel_disp = channel;
      if(channel != 4)
      {
         for(let i = 0; i < tv[0][0].length; i+=7)
            tv[0][0][i] = -channel;
         rtx.src = './RTXoff.svg';
      }
         else 
            rtx.src = './RTXon.svg';
   }
   M.save();
      M.translate(5, 4, -12);
      //M.rotateY(uTime / 10);
      M.scale(0.9);
      tv_ctrl.updateMatrix(matrix_multiply(sRotation, matrix_multiply(overall_ground,M.value())));
      tv_ctrl.draw();
   M.restore();
   M.save();
      M.translate(5, 2., -12);
      //M.rotateY(uTime / 10);
      M.scale(0.9);
      tv_ctrl1.updateMatrix(matrix_multiply(sRotation, matrix_multiply(overall_ground,M.value())));
      tv_ctrl1.draw();
   M.restore();
   M.save();
   M.translate(5, 0, -12);
   //M.rotateY(uTime / 10);
   M.scale(0.9);
   tv_ctrl2.updateMatrix(matrix_multiply(sRotation, matrix_multiply(overall_ground,M.value())));
   tv_ctrl2.draw();
   M.restore();
   if(!slider) make_slider();
   if(near_magician)
      draw_slider();
   if(show_magic)
      drawstars();
   if(rebuild)
      build_objects(state);

      M.save();
      if(donut_eaten){
         M.translate(0, -.4, 0);
         M.rotateY(uTime / 5);
         M.scale(0.23);
         setM(matrix_multiply(sRotation,matrix_multiply(overall_trans, M.value())));
      } else {
         M.translate(6, 2., 6);
         M.rotateY(uTime / 10);
         M.scale(0.4);
         setM(matrix_multiply(sRotation,matrix_multiply(overall_ground, M.value())));
      }
      drawMesh(torusMash);
   M.restore();

   for(const [obj, mat] of objects){
      let m = matrix_multiply(sRotation,matrix_multiply(overall_trans, mat));
      setM(m);
      drawMesh(obj);
   }

   gl.disable(gl.DEPTH_TEST);
   drawTrace(gl);

}

requestAnimationFrame(fpscounter);

pjsk.play();
pjsk.addEventListener('timeupdate', ()=>{updateVideoTextures = true;})
