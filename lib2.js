
//////////////////////////////////////////////////////////////////////////////////////////
//
// THIS IS THE SUPPORT LIBRARY.  YOU PROBABLY DON'T WANT TO CHANGE ANYTHING HERE JUST YET. 
//
//////////////////////////////////////////////////////////////////////////////////////////

let fragmentShaderHeader = [''                      // WHATEVER CODE WE WANT TO PREDEFINE FOR FRAGMENT SHADERS
   , 'precision highp float;'
   , 'float noise(vec3 point) { float r = 0.; for (int i=0;i<16;i++) {'
   , '  vec3 D, p = point + mod(vec3(i,i/4,i/8) , vec3(4.0,2.0,2.0)) +'
   , '       1.7*sin(vec3(i,5*i,8*i)), C=floor(p), P=p-C-.5, A=abs(P);'
   , '  C += mod(C.x+C.y+C.z,2.) * step(max(A.yzx,A.zxy),A) * sign(P);'
   , '  D=34.*sin(987.*float(i)+876.*C+76.*C.yzx+765.*C.zxy);P=p-C-.5;'
   , '  r+=sin(6.3*dot(P,fract(D)-.5))*pow(max(0.,1.-2.*dot(P,P)),4.);'
   , '} return .5 * sin(r); }'
].join('\n');

let nfsh = fragmentShaderHeader.split('\n').length; // NUMBER OF LINES OF CODE IN fragmentShaderHeader

let isFirefox = navigator.userAgent.indexOf('Firefox') > 0;         // IS THIS THE FIREFOX BROWSER?
let errorMsg = '';
//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function getBlob(data) {
   let bytes = new Array(data.length);
   for (let i = 0; i < data.length; i++) {
     bytes[i] = data.charCodeAt(i);
   } 
   return new Blob([new Uint8Array(bytes)]);
 }
let texture = [], gl, program;
let textures = []; 
let lock = false;
function loadTexture(gl, url, i) {
   const level = 0;
   const internalFormat = gl.RGBA;
   const width = 1;
   const height = 1;
   const border = 0;
   const srcFormat = gl.RGBA;
   const srcType = gl.UNSIGNED_BYTE;
   if (texture[i] == null)
   {
      texture[i] = gl.createTexture();
      const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
      gl.activeTexture(gl.TEXTURE0+i);
      gl.bindTexture(gl.TEXTURE_2D, texture[i]);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
         width, height, border, srcFormat, srcType,
         pixel);
   }
   // Because images have to be downloaded over the internet
   // they might take a moment until they are ready.
   // Until then put a single pixel in the texture so we can
   // use it immediately. When the image has finished downloading
   // we'll update the texture with the contents of the image.

   const image = new Image();
   image.onload = function () {
      gl.activeTexture(gl.TEXTURE0+i);
      gl.bindTexture(gl.TEXTURE_2D, texture[i]);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
         srcFormat, srcType, image);
   
      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
         // Yes, it's a power of 2. Generate mips.
         gl.generateMipmap(gl.TEXTURE_2D);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
         // No, it's not a power of 2. Turn off mips and set
         // wrapping to clamp to edge
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
   };
   image.src = url;
}

function isPowerOf2(value) {
   return (value & (value - 1)) == 0;
}
function gl_start(canvas, vertexShader, fragmentShader) {           // START WEBGL RUNNING IN A CANVAS

   setTimeout(function () {
      try {
         canvas.gl = canvas.getContext('webgl2');              // Make sure WebGl is supported. IT WOULD BE GREAT TO USE WEBGL2 INSTEAD.
      } catch (e) { throw 'Sorry, your browser does not support WebGL.'; }

      canvas.setShaders = function (vertexShader, fragmentShader) {         // Add the vertex and fragment shaders:

         gl = this.gl;
         program = gl.createProgram();                        // Create the WebGL program.

         function addshader(type, src) {                                        // Create and attach a WebGL shader.
            function spacer(color, width, height) {
               return '<table bgcolor=' + color +
                  ' width=' + width +
                  ' height=' + height + '><tr><td>&nbsp;</td></tr></table>';
            }
            errorMessage.innerHTML = '<br>';
            //  errorMarker.innerHTML = spacer('white', 1, 1) + '<font size=1 color=white>\u25B6</font>';
            let shader = gl.createShader(type);
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
               let msg = gl.getShaderInfoLog(shader);
               console.log('Cannot compile shader:\n\n' + msg);

               let a = msg.substring(6, msg.length);
               let line = 0;
               if (a.substring(0, 3) == ' 0:') {
                  a = a.substring(3, a.length);
                  line = parseInt(a) - nfsh;

                  editor.session.setAnnotations([{
                     row: line,
                     column: 0,
                     text: msg, 
                     type: "error" 
                  }]);
               }
               let j = a.indexOf(':');
               a = 'line ' + (line+1) + a.substring(j, a.length);
               if ((j = a.indexOf('\n')) > 0)
                  a = a.substring(0, j);
               errorMessage.innerHTML = a;
            }
            else
               editor.session.clearAnnotations();
            gl.attachShader(program, shader);
         };

         addshader(gl.VERTEX_SHADER, vertexShader);                         // Add the vertex and fragment shaders.
         addshader(gl.FRAGMENT_SHADER, fragmentShaderHeader + fragmentShader);

         gl.linkProgram(program);                                               // Link the program, report any errors.
         if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            console.log('Could not link the shader program!');
         gl.useProgram(program);
         gl.program = program;
         const ns = 2;
         for(let i = 0; i < ns; ++i){
            loadTexture(gl, './'+(i+1)+'.jpg', i); //Texture loading.
            textures[i] = i;
         }
         gl.uniform1iv(gl.getUniformLocation(program, 'uSampler'), textures);

         gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());                     // Create a square as a triangle strip
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(                       //    consisting of two triangles.
            [-1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0]), gl.STATIC_DRAW);

         let aPos = gl.getAttribLocation(program, 'aPos');                      // Set aPos attribute for each vertex.
         gl.enableVertexAttribArray(aPos);
         gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      }

      canvas.setShaders(vertexShader, fragmentShader);                     // Initialize everything,
      setInterval(function () {                                             // Start the animation loop.
         gl = canvas.gl;
         if (gl.startTime === undefined)                                            // First time through,
            gl.startTime = Date.now();                                              //    record the start time.
         animate(gl);
         gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);                                    // Render the square.
      }, 30);

   }, 100); // Wait 100 milliseconds after page has loaded before starting WebGL.
}

// THE animate() CALLBACK FUNCTION CAN BE REDEFINED IN index.html.

function animate() { }

function setUniform(type, name, a, b, c, d, e, f) {
   let loc = gl.getUniformLocation(gl.program, name);
   (gl['uniform' + type])(loc, a, b, c, d, e, f);
}

