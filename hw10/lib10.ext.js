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
var rebuild = [true, true],
   presentation = false,
   sRotation = matrix_identity();
var state = new State(0), state1 = new State(1);
state1.death = (hitter)=>{if(!state1.dead){state1.defaultDeath();channel=5;show_magic = true;}};
state.death = (hitter)=>{if(!state.dead){state.defaultDeath();channel=6;}};
state1.hitID = 9;
var facing = 1;
let curr_mouse_pos = [-10, -10, -10];
var updateVideoTextures = false;
var show_magic = false;
var slider_dl = 0;
var donut_eaten = false;
var Boxing = true;
var gamestart = false;
let int_fxydL = 0, trace = [];//[x, y, tijp[o'm]]
//schema.height = screen.height * .9;
var channel = 3, channel_disp = -1;
let difficulty_levels = {
   hard: {
      flex : .1,
      freq : 25,
      speed: .8,
      th   : 2.,
      startTimer : 15,
      punchSpeed: 10,
      original : 0
   },
   medium: {
      flex : .07,
      freq : 200,
      speed: .4,
      th   : 1.8,
      startTimer : 5,
      punchSpeed: 5,
      original : 1
   },
   easy: {
      flex : .03,
      freq : 400,
      speed: .2,
      th   : 1.5,
      startTimer : 4,
      punchSpeed: 8,
      original: 2
   }
}, dl_orig = [difficulty_levels.hard, difficulty_levels.medium, difficulty_levels.easy];
var difficulty = deepcopy(difficulty_levels.medium);
state1.set_stepSize(difficulty.speed);
state1.turnStep = difficulty.flex;
state1.delta_l = [4, -5];
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
   gamestart = false;
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
   state.delta_l = [0, 0];
   facing = 1;
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
   if (!(mouselastX == undefined || mouselastY == undefined)  && !near_magician) {
      if (movescene) {
         sRotation = matrix_multiply(matrix_rotateX(-dy / 60), sRotation);
         sRotation = matrix_multiply(matrix_rotateY(-dx / 60), sRotation);
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
   if(slider)slider.dragging = false;
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
         state.figure_rot = (pi*(facing/2));
      else state.figure_rot = 0;
      if(!keyhold || oldfacing != facing)
      {
         state.running = 20;
         state.dir_sdl = 0;
         keyhold = true;
      }
      else
         state.running = state.running > 5? state.running:5;
      rebuild[0] = true;
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
   if(e.code == 'KeyF'&&Boxing){
      state.start_punch();
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
let addObject = (obj, mat, i) => {
   objects[i].push([obj, mat]);
};
let clearObject = (i) => {
   delete objects[i];
   objects[i] = [];
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
let build_objects = (state, i) => {
   if(state.head === undefined)
   {
      state.head = head.slice();
      state.cylinderMesh = cylinderMesh.slice();
      state.cylinderMesh2 = cylinderMesh2.slice();
      state.cylinderMesh3 = cylinderMesh3.slice();
      if(state.idx == 0)
      {
         changeID(12, state.head);
         changeID(6, state.cylinderMesh);
         changeID(8, state.cylinderMesh2);
         changeID(10, state.cylinderMesh3);
      }
   }
   let lh,lf,rh,rf,dh,dl, head_rot = 0;
   if(!state.dead){
      if (state.running === 0)
         rebuild[i] = false;
      res = state.next();
      lh=res.lh;lf=res.lf;rh=res.rh;rf=res.rf;dh=res.dh;dl=res.dl;
      if(state.dir_sdl > 0){
         state.delta_l = plus(state.delta_l, const_multiply(dl, state.direction_l));
         state.dir_sdl -= dl;
         state.running = 1;
      }else
         state.delta_l[abs(facing) - 1] += Math.sign(facing) * dl;
      if(state.idx === 0)
         if(sqlen(state.delta_l[0] - 8, state.delta_l[1] + 6)< 6)
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
         } else if(!donut_eaten && sqlen(state.delta_l[0] - 6, state.delta_l[1] - 6) < 5){
            donut_eaten = true;
            state.life += 1;
            pushStatus('Yum');
         }
      state.delta_height = dh;
   } else {
      rh = lh = pi/2;
      lf = rf = 0;
      if(state.wiggle_t > 0){
         state.running = 1;
         state.wiggle_t -= .025;
         if(state.wiggle_t > 2)
            head_rot = wiggle(state.wiggle_t-2);
      }
   }
   clearObject(i);
   const punch = state.dead?1:state.punch();
   let overall_rot = 0, overall_death_trans = [0,0];
   if(state.dead && state.death_t > 0){
      state.death_t -= .025;
      const t = jCurve(1-state.death_t);
      overall_rot = -t*pi/2;
      overall_death_trans[0] = 2.3*sin(overall_rot);
      overall_death_trans[1] = -2.3*(1-cos(overall_rot));
      rebuild[state.idx] = true;
   }else if (state.dead){
      overall_rot = -pi/2;
      overall_death_trans[0] = -2.3;
      overall_death_trans[1] = -2.3;
   }
   M.save();
      M.translate(0, overall_death_trans[0], overall_death_trans[1]);
      M.rotateX(overall_rot);
      M.save();
         M.translate(0, 1, 0);
         M.rotateY(head_rot);
         addObject(state.head, M.value(),i);
      M.restore();
      M.save();
         M.translate(0.5, 0.2, 0.3);
         M.rotateX((pi / 4)*punch);
         M.translate(0, 0, .5);
         M.save();
            M.translate(0, 0, .4);
            M.rotateX((-0.53 * pi)*punch);
            M.scale(0.2, 0.2, 0.4);
            M.translate(0, 0, 1);
            addObject(state.cylinderMesh2, M.value(),i);
         M.restore();
         M.scale(0.2, 0.2, 0.5);
         addObject(state.cylinderMesh2, M.value(),i);
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
            addObject(state.cylinderMesh2, M.value(),i);
         M.restore();
         M.scale(0.2, 0.2, 0.5);
         addObject(state.cylinderMesh2, M.value(),i);
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
            addObject(state.cylinderMesh3, M.value(),i);
         M.restore();
         M.scale(0.2, 0.2, 0.5);
         addObject(state.cylinderMesh3, M.value(),i);
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
            addObject(state.cylinderMesh3, M.value(),i);
         M.restore();
         M.scale(0.2, 0.2, 0.5);
         addObject(state.cylinderMesh3, M.value(),i);
      M.restore();
      M.save();
         M.rotateX(pi / 2);
         M.scale(0.5, 0.5, 1);
         addObject(state.cylinderMesh, M.value(),i);
      M.restore();

   M.restore();
   if (state.running < 0)
      rebuild[i] = false
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
   n = 10;
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
   for(let i = 0; i < 7; ++ i){
      sakura[i] = new Float32Array(thicken_contour(.8, sakura[i]));
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

   M.save();
   M.translate(-.7,.75,0);
   //M.rotateZ(pi);
   M.scale(0.6)
   setM(M.value());

   for(let l = 2; l < 6; ++l)
      drawMesh(new Float32Array(adt[l-2]),gl.LINE_LOOP);
   M.restore();
   if(state.life >=.5)
   {
      M.save();
      // M.scale(sin(uTime/2));
         M.translate(-.23, .7, 0);

         M.rotateZ(sin(uTime/6) + 0.2);
         M.scale(0.4);
         setM(M.value());
         for(let l = 0; l < 5; ++l)
            drawMesh(sakura[l],gl.TRIANGLE_STRIP);
      M.restore();
   }
   if(state.life >= 1.5 )
   {
         M.save();
         M.translate(0.2, .7, 0);

         M.rotateZ(sin(uTime/6) + 0.2);
         M.scale(0.4);
         setM(M.value());
         for(let l = 0; l < 5; ++l)
            drawMesh(sakura[l],gl.TRIANGLE_STRIP);
         M.restore();
   }
   if (state.life > 2.5)
   {
      M.save();
      M.translate(.7, .7, 0);
      M.rotateZ(sin(uTime/6) + 0.2);
      M.scale(0.6);
      M.scale(0.995);
      M.save();
      setM(M.value());
      M.restore();
      for(let l = 0; l < 5; ++l)
         drawMesh(new Float32Array(sakura[l]),gl.TRIANGLE_STRIP);
      M.restore();
   }
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
            //initTextures(gl, gl.program);
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
         for(let i = 0; i < ns + 2; ++ i){
            textures[i] = i;
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, texture[i]);
         }
         gl.uniform1iv(gl.getUniformLocation(gl.shaders[1], 'uSampler'), textures);

         drawMesh(obj[0]);
      }
   });
   M.restore();
}
let initialize=(lv) => {
   difficulty = deepcopy(lv);
   state1.set_stepSize(difficulty.speed);
   state1.turnStep = difficulty.flex;
   state1.delta_l = [4, -5];
   channel = 3;state.initialize();state1.initialize();reset.onclick();state1.delta_l = [4,-5];
};
let tv_ctrl = new Button(()=>{initialize(difficulty_levels.hard);});
let tv_ctrl1 = new Button(()=>{initialize(difficulty_levels.medium);});
let tv_ctrl2 = new Button(()=>{initialize(difficulty_levels.easy);});

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
   setup_control(tv_ctrl, 'Difficulty Level: Hard.', 8);
   setup_control(tv_ctrl1, 'Difficulty Level: Medium.', 9);
   setup_control(tv_ctrl2, 'Difficulty Level: Easy.', 10);
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
var iMesh = [], tMesh, tMesh2, eMesh;
function createEar(){
   M.save();
   M.scale(.5,.5,.35);
   M.rotateX(pi/2);
   eMesh = createMeshFromSpline(19, 32, 4, 1, .0);
   transform_mesh(M.value(), eMesh);
   M.restore();
}
function createTail(){
   let tail = [
      2.37,1.48,
      109.39,18.21,
      96.13,88.3,

      96.13,88.3,
      126.44,94.93,
      118.86,135.21,
      
      118.86,135.21,
      148.54,135.21,
      146.96,164.7,

      146.96,164.7,
      172.85,168.17,
      169.38,184.27,
      
      169.38,184.27,
      124.87,179.22,
      131.34,148.2,
      
      131.34,148.2,
      99.92, 148.2,
      105.66,115.13,
      
      105.66,115.13,
      63.62,117.02,
      75.2,68.93,

      75.2,68.93,
      12.78,62.41,
      2.37,1.48,

      96.13,88.3,
      118.86,135.21,
      75.2,68.93,

   ], tx_max = -1000, tx_min = 1000, ty_max= -1000, ty_min = 1000;
   for(let i = 0; i < tail.length; i += 2){
      tx_max = tx_max > tail[i]?tx_max:tail[i];
      tx_min = tx_min < tail[i]?tx_min:tail[i];
      ty_max = Math.max(ty_max, tail[i+1]);
      ty_min = Math.min(ty_min, tail[i+1]);
   }
   let tx_scale = tx_max - tx_min, ty_scale = ty_max - ty_min;
   let t_scale = Math.max(tx_scale, ty_scale);
   for(let i = 0; i < tail.length; i += 2){
      tail[i] = (tail[i] - tx_min) / t_scale;
      tail[i + 1] = (tail[i + 1] - ty_min) / t_scale;
   }
   let l = tail.length / 2;
   tMesh = new Float32Array(2*l*7), tMesh2 = new Float32Array(2*l*7);
   for(let i = 0; i < l; ++ i)
   {
      tMesh[i*7] = 1;
      tMesh[i*7+1] = tail[i*2];
      tMesh[i*7+2] = tail[i*2 + 1];
      tMesh[i*7+3] = .03;
      tMesh[i*7+4] = 0;
      tMesh[i*7+5] = 0;
      tMesh[i*7+6] = -1;

      tMesh[l*7+i*7] = 1;
      tMesh[l*7+i*7+1] = tail[i*2];
      tMesh[l*7+i*7+2] = tail[i*2 + 1];
      tMesh[l*7+i*7+3] = -.03;
      tMesh[l*7+i*7+4] = 0;
      tMesh[l*7+i*7+5] = 0;
      tMesh[l*7+i*7+6] = 1;

      tMesh2[i*14] = 1;
      tMesh2[i*14+1] = tail[i*2];
      tMesh2[i*14+2] = tail[i*2 + 1];
      tMesh2[i*14+3] = .03;
      tMesh2[i*14+4] = 0;
      tMesh2[i*14+5] = 0;
      tMesh2[i*14+6] = -1;
      tMesh2[i*14 + 7] = 1;
      tMesh2[i*14+8] = tail[i*2];
      tMesh2[i*14+9] = tail[i*2 + 1];
      tMesh2[i*14+10] = -.03;
      tMesh2[i*14+11] = 0;
      tMesh2[i*14+12] = 0;
      tMesh2[i*14+13] = 1;
   }
}
function updateImplicitShapes(){   
   let divs = 100;
   let params = [

      [
         [[-.3,0.13,.43], .07],
         [[-.3,0.1,.4], .09],
         [[-.3,-.08,.22], .09],
         [[-.25,0,.2], .14],
         [[-.25,-.1,.15], .14],
         [[-.2,-0.05,.15], .15],[[-.2, .15, -0.05], .15],
         [[-.2,-.08,.12], .15],[[-.20, .12, -0.08], .15],
      ],[
         [[-.3, .43, 0.12], .07],
         [[-.3, .4, 0.1], .09],
         [[-.3, .22, -0.08], .09],
         [[-.25, .2, 0], .14],
         [[-.25, .15, -0.1], .14],
         [[-.2,-0.05,.15], .15],[[-.2, .15, -0.05], .15],
         [[-.2, .15, -0.05], .15],[[-.20, .12, -0.08], .15],
      ],
      [
         [[-.2,-.21, .09], .2],[[-.2,.09, -.21], .2],
         [[-.15,-.08, -.08], .2],
         [[-.0,-0.12,0.12],.165],[[-.0,.12,-.12],.165],
         [[.05,-0.14,.01],.17],[[.05,0.01,-.14],.17],

         [[.15,-0.1,0.04],.17],[[.15,.04,-.1],.17],
         
         [[.45,0.04,0.04],.2],
         // [[.5,.06, .06], .18],
      ], //body
      [
         [[.35,0.06,0.06],.1],
         [[.45,0.18,0.],.16],[[.45,0.,0.18],.16],
        // [[.5,0.1,0.1],.1],
         [[.55,0.0,0.0],.16],
         [[.5,0.16,0.16],.1],
         [[.65,0.12,0.0],.16],[[.65,0.0,0.12],.16]

      ], //head
      ];
      params.forEach((p, i)=>{
         iMesh[i] = implicitSurfaceTriangleMesh(implicitFunction, divs,
            p,1);
         });
      }
function animate(gl) {
   buildsplines &&= build_splines();// || setTVCtrl();
   if(iMesh.length == 0) updateImplicitShapes();
   if(tMesh === undefined) createTail();
   if(eMesh === undefined) createEar();
   if (animating) {
      uTime = (Date.now() - startTime) / 1000;
   } else {
      uTime = (lastTime - startTime) / 1000;
      //setUniform('1f', 'uTime', uTime);
   }
   gl.enable(gl.DEPTH_TEST);
   let orig_rot = sRotation.slice();
   sRotation = matrix_multiply(matrix_translate(-.3, 0,0), orig_rot);

   M.save();
      M.scale(0.1);
      M.rotateX(.6);
      M.rotateZ(.35);
      overall_ground = M.value();

      M.translate(state.delta_l[0], -state.delta_height, state.delta_l[1]);
      M.rotateY(state.curr_figure_rot);
      overall_trans = M.value();
   M.restore();


   M.save();
      setM(matrix_multiply(sRotation, M.value()));
      iMesh.forEach( (mesh, _)=>
      {
         drawMesh(mesh);
      });

   M.restore();

   
   M.save();
   M.scale(.8);
   M.translate(.1, -.62, -.62);
   M.rotateX(.8);
   M.rotateY(pi);
   M.rotateZ(-.1);
   M.translate(-.5, -.5,0);
   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(tMesh, gl.TRIANGLES);
   drawMesh(tMesh2);
   
   M.restore();

   M.save();
      M.translate(1., .1, -.15);
      M.rotateY(-.5*pi);
      M.rotateX(-.5*pi);

      setM(matrix_multiply(sRotation, M.value()));
      drawMesh(eMesh);
   M.restore();
   M.save();
   M.translate(.9, -.1, .35);
   M.rotateY(-1.*pi);
   M.rotateX(-.5*pi);
   M.rotateZ(.2*pi);

   setM(matrix_multiply(sRotation, M.value()));
   drawMesh(eMesh);
   M.restore();
   gl.disable(gl.DEPTH_TEST);
   drawTrace(gl);
   sRotation = orig_rot;
}
