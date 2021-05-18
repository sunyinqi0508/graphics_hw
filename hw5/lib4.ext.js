let ctrl = false, alt = false, shift = false, fpson = true, moving = false, over = false;
let lastClick = undefined;
let animating = true;
let flags = 0x0;
var startTime = Date.now();
let lastTime = Date.now();
var lastFrameTime = 0;
let oldDocument;
let fullscreen = false, btntoggled = false;
let movescene = true;
let oldparents = {};
var tr, div;
let canvas_originalsize;
let Sph = [];
let SphTr = [];
let SphDletaR = []
let selected = false, selection = -1, dragging = false;
let overall_trans = matrix_identity();
let rebuild = true, presentation = true, sRotation = matrix_identity();
let facing = 1, running = 0;
for(let i = 0; i < ns; ++i)
{
   SphTr[i]=matrix_identity();
   SphDletaR[i] = 0;
}
function toggleFullscreen(element){
   if(fullscreen)
   { 
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
   }
   else{
      if(element.requestFullscreen)
         element.requestFullscreen();
      else if (element.webkitRequestFullscreen)
         element.webkitRequestFullscreen();
      else if(element.msRequestFullscreen)
         element.msRequestFullscreen();
      fullscreen = true;
      bnfs.innerText = "Exit Fullscreen";
   }
}
bnfs.onclick = function(e){
   if(e === "no")
      ;
   else
      btntoggled = true;
   if(fullscreen){
      oldparents[controls].appendChild(controls);
      oldparents[canvas1].appendChild(canvas1);
      canvas1.style.width = canvas_originalsize[0];
      canvas1.style.height = canvas_originalsize[1];
      howitworks.hidden = false;
   }else{
      div = document.createElement("div");
      tr = document.createElement("table").insertRow();
      tr.style.backgroundColor="white";
      let size = Math.min(screen.availHeight, screen.availWidth);
      canvas_originalsize = [canvas1.style.width, canvas1.style.height, canvas1.width, canvas1.height];
      canvas1.style.height = canvas1.style.width = size;
      howitworks.hidden=true;
      oldparents[controls] = controls.parentNode;
      oldparents[canvas1] = canvas1.parentNode;

      let td1 = tr.insertCell();
      td1.appendChild(canvas1);
      let td2;
      td2 = tr.insertCell();
      td2.style.verticalAlign="top";
      td2.appendChild(controls);

      div.appendChild(tr);
      document.body.appendChild(div);
   }
   toggleFullscreen(div);
}
mov.onclick=function(_){
   movescene = !movescene;
   if(!movescene)
   {
      mov.innerText= "Move Scene";
      mov.style.width = "170px";
   }
   else
   {
      mov.innerText = "Move Lighting&Texture";
      mov.style.width = "280px";
   }
}
document.addEventListener("webkitfullscreenchange", ()=>{if(!btntoggled && fullscreen)bnfs.onclick("no");btntoggled = false;});
document.addEventListener("fullscreenchange", ()=>{if(!btntoggled && fullscreen)bnfs.onclick("no");btntoggled = false;});
clrsel.onclick=function(_){
   setUniform("1i", "sel", -1);
   selected = false;
   selection = -1;
}
reset.onclick = function(_){
   clrsel.onclick();
   if(!animating)
      pause_resume();
   flags = 0;
   moving = false;
   mousedx = mousedy = mousedz = 0;
   positionsupdated = true;
   for(let i = 0; i < ns; ++i)
   {
      SphTr[i]=matrix_identity();
      SphDletaR[i] = 0;
   }
   rtx.src='./RTXon.svg';
   setUniform('1i', 'flags', flags);
}
bns.onclick=function(e){
   if(ins.value>0 &&ins.value<=ns &&cns!=ins.value)
   {   
      cns = ins.value;
      fragmentShaderDefs = '\n const int cns = ' + cns + ';';
      if(typeof canvas1.setShaders === "function")
         canvas1.setShaders(vs, editor.getSession().getValue());
   }
}
bnsamp.onclick=function(e){
   let multiplier  = insamp.value;
   let w = parseInt(canvas1.style.width)*multiplier;
   let h = parseInt(canvas1.style.height)*multiplier;
   canvas1.height = h;
   canvas1.width = w;
   gl.viewport(0, 0, w, h);
   //gl.clearRect(0, 0, w, h);
}
// SET UP THE EDITABLE TEXT AREA ON THE LEFT SIDE.
ace.require("ace/ext/language_tools");
var editor = ace.edit("ace", {
   mode:"ace/mode/glsl",
   theme:"ace/theme/crimson_editor"
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
if(fs != undefined)
    editor.getSession().setValue(fs);
editor.session.on('change', function(delta) {
   if(typeof canvas1.setShaders === "function")
   {
      canvas1.setShaders(vs, editor.getSession().getValue());
      setUniform('1i', 'flags', flags);
   }
});
// REPARSE THE SHADER PROGRAM AFTER EVERY KEYSTROKE.
delete editor.KeyBinding;


let pause_resume = function(){
   if(animating)
      lastTime = Date.now();
   else
      startTime += Date.now() - lastTime;   
   animating = !animating;
};
canvas1.addEventListener('click',function(ev){
   if(!(shift && alt) && lastClick&& Date.now()-lastClick<400)
      pause_resume();
   lastClick = Date.now();
});
canvas1.addEventListener('mouseover', function(e){
   over = true;
   const mask = 0x8;
   flags |= mask;
   setUniform('1i', 'flags', flags);
});
canvas1.addEventListener('mousedown', function(e){
      moving = true
      mouselastX = mouselastY =  undefined;
      let i = hitTest([2*e.offsetX/ parseInt(canvas1.style.width)-1, 
         1-2*e.offsetY/ parseInt(canvas1.style.height), -1]);
      if(i >= 0)
      {
         dragging = true;
         selected = true;
         setUniform("1i", "sel", i);
         selection = i;
      }
      else if(selected = true){
         dragging = false;
         selected = false;
         setUniform("1i", "sel", i);
         selection = i;
      }
});
canvas1.addEventListener('mousemove', function(e){
      if(!(mouselastX==undefined || mouselastY == undefined)&&moving){
         let dx = (mouselastX - e.offsetX), 
             dy = (mouselastY - e.offsetY);
         if(movescene){
            sRotation = matrix_multiply(sRotation, matrix_rotateY(-dy/60));
            sRotation = matrix_multiply(sRotation, matrix_rotateX(-dx/60)); 

         } 
         else if(!selected)
         {
               mousedx -= dx/60;
               mousedy -= dy/60;
               positionsupdated = true;
         }else if(dragging){
               let m = matrix_rotateY(-mousedx);
               m = matrix_multiply(m, matrix_rotateX(-mousedy));
               let dv = matrix_multiply(m, [2*-dx/ parseInt(canvas1.style.width), 
                  2*dy/ parseInt(canvas1.style.height), 0, 1]).slice(0,3);
               SphTr[selection] = matrix_multiply(SphTr[selection], matrix_translate(dv[0], dv[1], dv[2]));
         }
         
      }
      mouselastX = e.offsetX;
      mouselastY = e.offsetY;
});
canvas1.addEventListener('mouseup', function(e){
   moving = false;
   dragging = false;
});
canvas1.addEventListener('mouseout', function(e){
   const mask = 0x8;
   flags &= !mask;
   setUniform('1i', 'flags', flags);
   over = false;
   moving = false;
});
canvas1.addEventListener('wheel', function(e){
   if(!selected){
      mousedz += e.wheelDelta/600;
      positionsupdated = true;
   }
   else{
      SphDletaR[selection] += e.wheelDelta / 800;
   }
});
canvas1.scroll(function(e) {e.stopPropagation();});
rtx.style.cursor="pointer";
let rtswitch = function(){
   alert('Ray Tracing is always on. See hw2 where rt can be toggled on/off.')
   rtx.src='./RTXon.svg';
}
rtx.addEventListener('click', rtswitch);
var requestAnimationFrame = window.requestAnimationFrame ||
 window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
let fpscounter = function(time){
      if (start === undefined)
         start = time;
      else
         fps.innerHTML = Math.round(10000/(time-start))/10 + ' fps';
      start = time;
      if(fpson)
         ;//requestAnimationFrame(fpscounter);
      else{
         start = undefined;
         fps.innerHTML = '';
      }
   };
document.addEventListener('keydown',(e)=>{
   if(e.code.startsWith('Shift'))
      shift = true;
   if(e.code.startsWith('Control'))
      ctrl = true;
   if(e.code.startsWith('Alt'))
      alt = true;
   else if(ctrl && alt && e.code == 'KeyT'){
      const mask = 0x1;
      flags = flags&!mask | (!(flags&mask)?mask:0);
      setUniform('1i', 'flags', flags);
   }
   else if (ctrl &&e.code == 'KeyS'){
      let a = document.createElement('a');
      a.href = "data:text/plain,"+encodeURIComponent(editor.getSession().getValue());
      a.download = 'shader.frag';
      a.click();
   }
   else if(ctrl && alt&&e.code == 'KeyR')
      rtswitch();
   else if(ctrl && alt&&e.code == 'KeyN')
   {
      reset.onclick();
   }
   else if(ctrl && alt&&e.code == 'KeyP')
      pause_resume();
   else if(ctrl && alt&&e.code == 'KeyF')
      if(!fpson)
      {
         fpson = true;
         requestAnimationFrame(fpscounter);
      }
      else
         fpson = false;

   if(e.code == 'ArrowUp' || e.code == 'ArrowDown' || e.code =='ArrowLeft'
      ||e.code == 'ArrowRight' || e.code =='KeyW'||e.code =='KeyS')
      {
         switch(e.code){
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
      running = 20;
      rebuild = true;
   }
   if(fullscreen && selected ){
      if(e.code =='KeyF'||e.code =='KeyB'){
            let m = matrix_rotateY(-mousedx);
            m = matrix_multiply(m, matrix_rotateX(-mousedy));
            m = const_multiply((fl + 1 + mousedz)/(fl+1), m);

            switch(e.code){   
               case 'KeyB':
                  var dv = matrix_multiply(m, [0,0, -0.1, 1]).slice(0,3);
                  m = matrix_translate(dv[0], dv[1], dv[2]);
                  break;
               case 'KeyF':
                  var dv = matrix_multiply(m, [0,0, 0.1, 1]).slice(0,3);
                  m = matrix_translate(dv[0], dv[1], dv[2]);
                  break;                
            }
            SphTr[selection] = matrix_multiply(SphTr[selection], m);
      }

      }
});

document.addEventListener('keyup',(e)=>{
   if(e.code.startsWith('Control'))
      ctrl = false;
   if(e.code.startsWith('Alt'))
      alt = false;
   if(e.code.startsWith('Shift'))
      shift = false;
});
let squareMesh = new Float32Array([ -1,-1,1,0,0,0,0,0,-1, 1,1,0,0,0,0,0,-1, -1,-1,0,0,0,0,0, -1,1,-1,0 ,0,0,0,0]);
let sphereMesh   = createMesh(32, 32, uvToSphere);
let tubeMesh     = createMesh(32, 2, uvToTube,0,1);
let diskMesh     = createMesh(32, 2, uvToDisk,0,1);
let tubeMesh2     = createMesh(32, 2, uvToTube,0,2);
let diskNMesh2    = createMesh(32, 2, uvToDisk, -1,2);
let diskPMesh2    = createMesh(32, 2, uvToDisk,  1,2);
let tubeMesh3     = createMesh(32, 2, uvToTube,0,3);
let diskNMesh3    = createMesh(32, 2, uvToDisk, -1,3);
let diskPMesh3    = createMesh(32, 2, uvToDisk,  1,3);
let diskNMesh    = createMesh(32, 2, uvToDisk, -1,1);
let diskPMesh    = createMesh(32, 2, uvToDisk,  1,1);
let cylinderMesh = glueMeshes(glueMeshes(tubeMesh, diskPMesh), diskNMesh);
let cylinderMesh2 = glueMeshes(glueMeshes(tubeMesh2, diskPMesh2), diskNMesh2);
let cylinderMesh3 = glueMeshes(glueMeshes(tubeMesh3, diskPMesh3), diskNMesh3);
let torusMash    = createMesh(32, 32, uvToTorus, 1, 5);
let head = createCube(1.5,1,1, 4);

let objects = [];
let addObject = (obj, mat) => {
   objects.push([obj, mat]);
};
let clearObject = () => {delete objects; objects = [];};

let delta_height = 0, delta_l = [0,0];
class State{
   constructor() {
      this.leg = true;
      this.progress = 0;
      this.rh = this.lh = .5*pi;
      this.lf = this.rf = 0;
   }
   initialize(){
      this.leg = true;
      this.progress = 0;
   }
   next(){
      //return this.presentation();
      if(running <= 0)
         return {rh:.5*pi, lh:.5*pi, rf:0, lf:0, dh:0,dl:0}
      running --;
      const steps = 100;
      let dl = 0;
      if(this.progress >= steps/2)
      { 
         this.progress = 0;
         this.leg = !this.leg;
      }
      let delta = [-pi/5, 0.5*pi, 0.44*pi, 0.55*pi];
      for (let i = 0; i < 4; ++i) delta[i] /= steps;
      if(this.leg)
      {
         if(this.progress < steps/4)
         {
            this.lh += delta[0];
            this.rh += delta[3];
            this.lf += delta[1];
            this.rf += delta[2];
         }
         else{
            this.lh -= delta[0];
            this.rh -= delta[3];
            this.lf -= delta[1];
            this.rf-= delta[2];  
         }
      }
      else{
         if(this.progress < steps/4)
         {
            this.lh += delta[3];
            this.rh += delta[0];
            this.lf += delta[2];
            this.rf += delta[1];
         }
         else{
            this.lh -= delta[3];
            this.rh -= delta[0];
            this.lf -= delta[2];
            this.rf-= delta[1];  
         }
      }
      let delta_h = Math.max((1-cos(abs(this.lh - pi/2)))*.5+(1-cos(abs(this.lf)))*.6,(1-cos(abs(this.rh - pi/2)))*.5+(1-cos(abs(this.rf)))*.6);
      this.progress++;  
      return  {lh:this.lh, lf:this.lf, rh:this.rh,rf:this.rf, dh:delta_h, dl:1.8522/steps};
   }
   // presentation(){
   //    return {lh:.4*pi, lf:pi/6,rh:.7*pi, rf:pi/8, dh:0};
   // }
};
let build_objects = (state)=>{
   if(running === 0)
      rebuild = false;
   let {lh, lf, rh, rf, dh, dl} = state.next();
   delta_l[abs(facing)-1] += 0.3* Math.sign(facing) * dl;
   delta_height = dh;
   clearObject();
   M.save();
      M.save();
         M.rotateX(pi/2);
         M.scale(0.5, 0.5, 1);
         addObject(cylinderMesh, M.value());
      M.restore();
      M.save();
         M.translate(0,1,0);
         addObject(head, M.value());
      M.restore();
      M.save();
         M.translate(0.5, 0.2, 0.3);
         M.rotateX(pi/4);
         M.translate(0,0,.5);
         M.save();
            M.translate(0,0,.4);
            M.rotateX(-0.53*pi);
            M.scale(0.2, 0.2, 0.4);
            M.translate(0,0,1);
            addObject(cylinderMesh2, M.value());
         M.restore();
         M.scale(0.2, 0.2, 0.5);
         addObject(cylinderMesh2, M.value());
      M.restore();
      M.save();
         M.translate(-0.5, 0.2, 0.3);
         M.rotateX(pi/4);
         M.translate(0,0,.5);
         M.save();
            M.translate(0,0,.4);
            M.rotateX(-0.55*pi);
            M.scale(0.2, 0.2, 0.4);
            M.translate(0,0,1);
            addObject(cylinderMesh2, M.value());
         M.restore();
         M.scale(0.2, 0.2, 0.5);
         addObject(cylinderMesh2, M.value());
      M.restore();      
      M.save();
         M.translate(0.3, -1, 0.);
         M.rotateX(lh);
         M.translate(0,0,.5);
         M.save();
            M.translate(0,0,.45);
            M.rotateX(lf);
            M.scale(0.2, 0.2, 0.6);
            M.translate(0,0,1);
            addObject(cylinderMesh3, M.value());
         M.restore();
         M.scale(0.2, 0.2, 0.5);
         addObject(cylinderMesh3, M.value());
      M.restore();
      M.save();
         M.translate(-0.3, -1, 0.);
         M.rotateX(rh);
         M.translate(0,0,.5);
         M.save();
            M.translate(0,0,.45);
            M.rotateX(rf);
            M.scale(0.2, 0.2, 0.6);
            M.translate(0,0,1);
            addObject(cylinderMesh3, M.value());
         M.restore();
         M.scale(0.2, 0.2, 0.5);
         addObject(cylinderMesh3, M.value());
      M.restore();
   M.restore();
   //rebuild = false;
};
let state = new State();
var M = new Matrix();

function animate(gl) {
   let uTime;
   if(animating)
   {
      uTime = (Date.now() - startTime) / 1000;
      setUniform('1f', 'uTime', uTime);
   }
   else
   {
      uTime = (lastTime - startTime) / 1000;
      setUniform('1f', 'uTime', uTime);
   }
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
   if(presentation){
      M.save();
         M.scale(0.3);
         M.rotateY(uTime/5);
         M.rotateX(1);
         M.translate(delta_l[0], -delta_height, delta_l[1]);
         if(facing !=2)
            M.rotateY(pi*(facing/2));

         //M.translate(0, -delta_height, 0);
         overall_trans = M.value();
      M.restore();
   }else{
      M.save();
        // M.rotateY(2);
         M.rotateX(1);
         M.scale(0.3);
         M.translate(delta_l[0], -delta_height, delta_l[1]);
         overall_trans = M.value();
      M.restore();
   }
   if(rebuild)
      build_objects(state);
   for(const [obj, mat] of objects){
      drawMesh(obj, matrix_multiply(sRotation,matrix_multiply(overall_trans, mat)));
   }
   M.save();
      M.scale(0.1);
      M.translate(6,0,1);
      M.rotateX(1);
      M.rotateY(uTime/4);
      drawMesh(torusMash, M.value());
   M.restore();
   if(positionsupdated)
      updatePositions();
}

requestAnimationFrame(fpscounter);
//pjsk.play();
