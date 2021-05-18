let ctrl = false, alt = false, shift = false, fpson = true, moving = false, over = false;
let lastClick = undefined;
let animating = true;
let flags = 0x0;
var startTime = Date.now();
let lastTime = Date.now();
var lastFrameTime = 0;
let oldDocument;
let fullscreen = false;
let oldparents = {};
var tr, div;
let canvas_originalsize;
let Sph = [];
let SphTr = [];
let SphDletaR = []
let selected = false, selection = -1, dragging = false;
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
bnfs.onclick = function(_){
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
         if(!selected)
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
   
   if(fullscreen && selected ){
      if(/*e.code == 'ArrowUp' || e.code == 'ArrowDown' || e.code =='ArrowLeft'
         ||e.code == 'ArrowRight' || e.code =='KeyW'||e.code =='KeyS'||*/e.code =='KeyF'||e.code =='KeyB'){
            let m = matrix_rotateY(-mousedx);
            m = matrix_multiply(m, matrix_rotateX(-mousedy));
            m = const_multiply((fl + 1 + mousedz)/(fl+1), m);

            switch(e.code){
               // case 'ArrowUp':
               //    m = matrix_multiply(m, matrix_rotateX(0.1));
               //    break;
               // case 'ArrowDown':
               //    m = matrix_multiply(m, matrix_rotateX(-0.1));
               //    break;
               // case 'ArrowLeft':
               //    m = matrix_multiply(m, matrix_rotateY(-0.1));
               //    break;
               // case 'ArrowRight':
               //    m = matrix_multiply(m, matrix_rotateY(0.1));
               //    break;
               // case 'KeyW':
               //    m = matrix_multiply(m, matrix_rotateZ(0.1));
               //    break;
               // case 'KeyS':
               //    m = matrix_multiply(m, matrix_rotateZ(-0.1));
               //    break;     
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
   
   if(positionsupdated)
      updatePositions();
}

requestAnimationFrame(fpscounter);
