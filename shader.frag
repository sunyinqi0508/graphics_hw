
vec3 foregroundColor = vec3(.0841, .5329, .9604); 
vec3 groundColor = vec3(.2, .3, .5);
vec4 groundSpecular = vec4(.71, .71, .71, 10.);
uniform float uTime;// TIME, IN SECONDS
uniform int flags;
//FLAGS 0-TEX, 1-RT, 2-MOVED, 3-FLASH, 4-TEX_ROT, 5-CLOUD

uniform vec4 rot; //ROTATION VALUES USED TO CALCULATE TRANSFORMATION MATRIX
//rot=[cosx, sinx, cosy, siny], x, y BING ROTATED ANGLE
uniform float dFL; //DELTA on FOCAL LENGTH
uniform vec3 fDir;//Flash light direction
varying vec3 vPos;// -1 < vPos.x < +1
// -1 < vPos.y < +1
//      vPos.z == 0

float fl=3.;//ORIGINAL FOCAL LENGTH
const float pi=3.14159265359;
const float _2pi=2.*pi;
const int n_ref=5; //<<=======***********************MAX NUMBER OF RAY TRACING RECURRSIONS. INCREASE IT IF YOUR GRAPHICS CARD CAN HANDLE.**************************** 
//const int ns=4; ns is added from .js
vec4 Sph[ns];
uniform sampler2D uSampler[ns];
vec3 Ambient[ns];
vec3 Diffuse[ns];
vec4 Specular[ns];
float ks[ns];
struct Sphere{ //UPDATED SPHERE STRUCTURE THAT SUPPORTS TRANSPARENCY.(UNUSED)
   vec4 Pos;
   vec3 Ambient;
   vec3 Diffuse;
   vec4 Specular;
   int textureid;
   float ks, kt;
};
struct RT{ //STACK FOR RECURSIVE RAY TRACING.
   vec3 color;
   float ks;
   // vec3 colorr;
   // float kt;
   // vec3 ptr;
   // vec3 normal;
} stack[n_ref];

bool getflag(int flag,int bit){
   float shifted = float(int(float(flag)/ pow(2.,float(bit))));
   return fract(shifted/2.)>0.;
}
float clampv(float val,float l,float h){
   return val<l?l:val>h?h:val;
}
void main(){
   ////////////////////////////////////////////////
   //
   // HERE, FOR YOUR HOMEWORK, YOU CAN WRITE ANY
   // CODE YOU LIKDEFINE A COLOR FOR THIS FRAGMENT.
   
   // LIGHT DIRECTION AND COLOR
   //* I USED LDir AS LIGHT POSITION
   //* I NORMALIZED IT AFTER GETTING THE 
   //* DIRECTION BY SUBTRACTING IT FROM THE POINT
   vec3 LDir=vec3(.5,.5,.5);
   vec3 LCol=vec3(1.,1.,1.);
   
   // SPHERE
   Sph[3]=vec4(.9*sin(uTime*.4),0.,.9*cos(uTime*.4),.25);
   Sph[2]=vec4(.22*sin(uTime*1.2),0.05,.22*cos(uTime*1.2),.02);
   Sph[0]=vec4(.45*sin(uTime),0.05*cos(uTime + 1.),.45*cos(uTime),.1);
   Sph[1]=vec4(0.,0.,0.,.15);
   
   // SURFACE REFLECTANCE PROPERTIES, can be transferred from .js
   Ambient[3]=vec3(.1,.1,.1);// r,g,b
   Diffuse[3]=vec3(.71,.71,.71);// r,g,b
   Specular[3]=vec4(.71,.71,.71,10.);// r,g,b,power
   Ambient[2]=vec3(.1,.05,.05);// r,g,b
   Diffuse[2]=vec3(.71,.71,.71);// r,g,b
   Specular[2]=vec4(.71,.71,.71,10.);// r,g,b,power
   Ambient[1]=vec3(.1,.05,.05);// r,g,b
   Diffuse[1]=vec3(1.,.5,.5);// r,g,b
   Specular[1]=vec4(1.,.5,.5,10.);// r,g,b,power
   
   Ambient[0]=vec3(.05,.05,.1);// r,g,b
   Diffuse[0]=vec3(.5,.5,1.);// r,g,b
   Specular[0]=vec4(1.,.5,.5,20.);// r,g,b,power
   ks[0] = 0.25;
   ks[1] = 0.1;
   ks[2] = 0.3;
   ks[3] = 0.05;
   // INITIALIZE TO A BACKGROUND COLOR
   vec3 color=vec3(.2, .3, .5);
   float ca=rot.x, sa = rot.y, cb=rot.z, sb=rot.w;
   mat3 transformation, invTr;//Transformation matrix for viewpoint.
   transformation[0] = vec3(ca, sb*sa, sa*cb);//because the matrices are all the same,
   transformation[1] = vec3(0, cb, -sb);//We don't need to calculate it for every pixel
   transformation[2] = vec3(-sa,ca*sb,ca*cb);//So, we get it from the CPU
   invTr[0] = vec3(ca, 0, -sa);//it's inverse, to calculate texture mapping.
   invTr[1] = vec3(sa*sb, cb, ca*sb);
   invTr[2] = vec3(cb*sa, -sb, ca*cb);
   vec3 trPos = transformation*((dFL+fl+1.)/(fl+1.))*vec3(vPos.xy, -1);
   // COMPUTE THE RAY ORIGIN AND DIRECTION
   vec3 V0=transformation*vec3(0.,0.,fl+dFL), V = V0;
   vec3 W=normalize(trPos-V);
   // RAY TRACE TO ALL OBJECTS IN THE SCENE
   bool rtxoff = getflag(flags, 1), 
   showtexture = !getflag(flags,0), 
   moved = getflag(flags,2)//,
//   flash = true;//getflag(flags, 3)
   ;//get flags.
 //  bool hit = false;
   int cnt_ref = n_ref;
   for(int j=0;j<n_ref;j++)
   {
      float tMin=10000.;
      int iMin = -1;
      for(int i=0;i<cns;i++){
         // SHIFT COORDINATES, SO THAT SPHERE IS AT (0,0,0)
         vec3 Vp=V-Sph[i].xyz;
         // SOLVE FOR QUADRATIC EQUATION IN t
         float B=dot(W,Vp);
         float C=dot(Vp,Vp)-Sph[i].w*Sph[i].w;
         float D=B*B-C;
         if(D>0.){
            float t=-B-sqrt(D);
            if(t > 0. && t < tMin){
               tMin = t; //This is an optimization, we don't have to do lighting/tex
               iMin = i; // for objects that are occuluded, which is expensive!
            }
         }
      }
      // IF RAY HITS SPHERE
      if(iMin >= 0){
         float t = tMin;
         vec3 S=V+t*W;
         for(int i = 0; i < cns; ++ i)
            if(i == iMin) //* Because GLSL doesn't support non-const index, 
            {             //*  we have to get Sph[iMin], uSampler[iMin], etc. this way
               //*Good old TEXTURE MAPPING from hw1
               vec3 tex_sph = (S-Sph[i].xyz);
               if(moved)
                  tex_sph=invTr*tex_sph;//* transform the sphere to original place if view point moved;
                                        //* This is super expensive! plus it's in the inner loop!!
                                        //* We added a flag to disable it when the viewport is not moved!
               float R=Sph[i].w;
               float tex_x=acos(abs(tex_sph.x)/sqrt(R*R-tex_sph.y*tex_sph.y));
               if(tex_sph.x>0.)
                  tex_x=pi-tex_x;
               tex_x*=1.5708;//*Correct aspect ratio of texture 2:1 -> 2pir:2r
               tex_x=tex_x+float(uTime);
               float quo=float(int(tex_x/_2pi));
               tex_x=tex_x/_2pi -quo;
               vec3 texture_color;
               if(showtexture)
                  texture_color=texture2D(uSampler[i],vec2(tex_x,((R-tex_sph.y)/(2.*R)))).xyz;
               else texture_color = foregroundColor;
               vec3 N=normalize(S-Sph[i].xyz);
               //*DIRECTIONS ARE NORMALIZED TO GET THE CORRECT PHONG LIGHTING
               vec3 realLDir=normalize(LDir-S); 
               color=(
                     Ambient[i]
                     +Diffuse[i]*max(0.,dot(N,realLDir))*LCol
                  )*texture_color
               ;
               // + SPECULAR COMPONENT GOES HERE
               if(rtxoff || j == n_ref - 1) //if it's the last ray
                  color += sqrt(float(j+1)) * Specular[i].xyz*pow(max(0.,
                  dot(2.*dot(N,realLDir)*N-realLDir,-W)),Specular[i].w);
               //*Pushing current color and ks into stack.
               //*suppose ks is 0.15 for all spheres, we can 
               //*of course support different ks, kt for different object
               //*but I didn't have time to do that, just a proof of concept,
               //*I defined the new sphere structure that could be used in the future.
               stack[j] = RT(color, ks[i]);
               V = S; //*NEXT RAY SHOOTING FROM THE INTERSECTION POINT 
               // if(flash && j == 0){
               //    V0 = V - V0;
               //    hit = true;
               // }               
               W = -normalize(2. * dot(N, W) * N - W);//*W is the next direction of the next ray.

               break;// this is only the innerloop, RT is still going!
            }
      }
      else {
      // TO SIMIPIFY THINGS UP, I'LL ASSUME THAT EVERYTHING 
      // IS INSIDE THE BOUNDING BOX [(-1,-1,-1), (1,1,1)]
      // AND THERE'S A FLOOR at [y = -1] THE NORMAL IS (0,1,0)
      // Because We assumed that the light always hit sphere first,
      // It will have wirld behavior when you rotate the scene upsidedown.
         float t = -(.2+V.y)/W.y;
         float sx = V.x + t* W.x, sz = V.z + t * W.z;

         if(t >= 0.&&abs(sx)<1.5 && abs(sz+.6)<3.)
         {   
            vec3 S = vec3(sx, -.2, sz);
            vec3 realLDir=normalize(LDir - S);
            color=(
                  0.5 //ambient for ground
                  +0.5*max(0.,realLDir.y)*LCol //diffusion for ground
               )*groundColor
            ;
            // + SPECULAR COMPONENT GOES HERE
            if(rtxoff || j == n_ref - 1)
               color += sqrt(float(j+1))*groundSpecular.xyz* //specular for ground.
                  pow(max(0., dot(vec3(-realLDir.x, realLDir.y,-realLDir.z),-W)),groundSpecular.w);
            stack[j] = RT(color, 0.15); //ks of ground is 0.1
            V = S; //Same as above, trace again from S, dir = reflect(W, N).
            // if(flash && j == 0){
            //    V0 = W;
            //    hit = true;
            // }
            W = vec3(W.x, -W.y, W.z); 
         }
         else{
            if(j > 0)
            {
               // If the light bounces away! The color of it is calculated by 
               stack[j] = RT(sqrt(float(j+1))*vec3(4.,4.,4)*pow(max(0.,dot(W, normalize(LDir - V))), 10.), 0.);
               cnt_ref = j + 1;
            }
            else //If the light hits the void in the first place, it's just black!
               cnt_ref = j;//j is always 0 in this case.
            break; //The light is shooting into the void, let's stop RT.
         }
      }       
      // RTX off
      if(rtxoff)
         break;
   }
   if(rtxoff)
      color = stack[0].color;
   else
   {
      color = vec3(0,0,0);
      float currks = 1.;
      for(int i = 0; i < n_ref; ++i)
      {
         if(i >= cnt_ref)//same trick to use bounded non-const on indexes
         {
            color += currks * stack[i - 1].color; //if there're less than n_ref rays, e.g. ray go to the void.
            break;
         }
         color += currks *(1.-stack[i].ks) * stack[i].color;
         currks *= stack[i].ks;
      }
      if(n_ref == cnt_ref)
         color += currks * stack[n_ref - 1].color;
   }
   // APPLY GAMMA CORRECTION AND SET THE PIXEL COLOR.

   gl_FragColor=vec4(sqrt(color),1.);
}
   