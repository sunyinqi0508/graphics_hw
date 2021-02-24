
vec3 foregroundColor = vec3(.0841, .5329, .9604);
vec3 groundColor = vec3(.2, .3, .5);
vec4 groundSpecular = vec4(.71, .71, .71, 10.);
uniform float uTime;// TIME, IN SECONDS
uniform int flags;
uniform vec4 rot;
uniform float dFL;
//FLAGS 0-TEX, 1-RT, 2-CLOUD, 3-TEX_ROT
varying vec3 vPos;// -1 < vPos.x < +1
// -1 < vPos.y < +1
//      vPos.z == 0

float fl=3.;
const float pi=3.14159265359;
const int n_ref=6;
const int ns=2;
vec4 Sph[ns];
uniform sampler2D uSampler[ns];
vec3 Ambient[ns];
vec3 Diffuse[ns];
vec4 Specular[ns];
struct Sphere{
   vec4 Pos;
   vec3 Ambient;
   vec3 Diffuse;
   vec4 Specular;
   int textureid;
   float ks, kt;
};
struct RT{
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
   
   vec3 LDir=vec3(.5,.5,.5);
   vec3 LCol=vec3(1.,1.,1.);
   
   // SPHERE
   
   Sph[0]=vec4(.5*sin(uTime),0.,.5*cos(uTime),.2);
   Sph[1]=vec4(0.,0.,0.,.2);
   
   // SURFACE REFLECTANCE PROPERTIES
   
   Ambient[1]=vec3(.1,.05,.05);// r,g,b
   Diffuse[1]=vec3(1.,.5,.5);// r,g,b
   Specular[1]=vec4(1.,.5,.5,10.);// r,g,b,power
   
   Ambient[0]=vec3(.05,.05,.1);// r,g,b
   Diffuse[0]=vec3(.5,.5,1.);// r,g,b
   Specular[0]=vec4(1.,.5,.5,20.);// r,g,b,power
   
   // INITIALIZE TO A BACKGROUND COLOR
   
   vec3 color=vec3(.2, .3, .5);
   float ca=rot.x, sa = rot.y, cb=rot.z, sb=rot.w;
   // COMPUTE THE RAY ORIGIN AND DIRECTION
   mat3 transformation, invTr;
   transformation[0] = vec3(ca, sb*sa, sa*cb);
   transformation[1] = vec3(0, cb, -sb);
   transformation[2] = vec3(-sa,ca*sb,ca*cb);
   invTr[0] = vec3(ca, 0, -sa);
   invTr[1] = vec3(sa*sb, cb, ca*sb);
   invTr[2] = vec3(cb*sa, -sb, ca*cb);

   vec3 trPos = transformation*vec3(vPos.xy, -2);

   vec3 V=transformation*vec3(0.,0.,fl+dFL);
   vec3 W=normalize(trPos-V);
   // RAY TRACE TO ALL OBJECTS IN THE SCENE
   bool rtxoff = getflag(flags, 1);
   int cnt_ref = n_ref;
   for(int j=0;j<n_ref;j++)
   {
      float tMin=10000.;
      int iMin = -1;
      for(int i=0;i<ns;i++){
         // SHIFT COORDINATES, SO THAT SPHERE IS AT (0,0,0)
         vec3 Vp=V-Sph[i].xyz;
         // SOLVE FOR QUADRATIC EQUATION IN t
         float B=dot(W,Vp);
         float C=dot(Vp,Vp)-Sph[i].w*Sph[i].w;
         float D=B*B-C;
         if(D>0.){
            float t=-B-sqrt(D);
            if(t > 0. && t < tMin){
               tMin = t;
               iMin = i;
            }
         }
      }
      // IF RAY HITS SPHERE
      if(iMin >= 0){
         float t = tMin;
         vec3 S=V+t*W;
         for(int i = 0; i < ns; ++ i)
            if(i == iMin)
            {
               //*TEXTURE MAPPING
               vec3 tex_sph=invTr*(S-Sph[i].xyz);
               float R=Sph[i].w;
               float tex_x=acos(abs(tex_sph.x)/sqrt(R*R-tex_sph.y*tex_sph.y));
               if(tex_sph.x>0.)
                  tex_x=pi-tex_x;
               tex_x=R*tex_x;
               tex_x*=1.5708;//*Correct aspect ratio of texture 2:1 -> 2pir:2r
               tex_x=tex_x+float(uTime)*R;
               float _2pir=2.*pi*R;
               float quo=float(int(tex_x/_2pir));
               tex_x=clampv((tex_x-quo*_2pir),0.,_2pir)/_2pir;
               vec3 texture_color;
               if(!getflag(flags,0))
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
               if(rtxoff || j == n_ref - 1)
                  color += sqrt(float(j+1)) * Specular[i].xyz*pow(max(0.,dot(2.*dot(N,realLDir)*N-realLDir,-W)),Specular[i].w);
               stack[j] = RT(color, 0.15);
               V = S;
               W = -normalize(2. * dot(N, W) * N - W);
               break;
            }
      }
      else {
      // TO SIMIPIFY THINGS UP, I'LL ASSUME THAT EVERYTHING 
      // IS INSIDE THE BOUNDING BOX [(-1,-1,-1), (1,1,1)]
      // AND THERE'S A FLOOR at [y = -1]

         float t = -(.2+V.y)/W.y;
         float sx = V.x + t* W.x, sz = V.z + t * W.z;

         if(t >= 0.&&abs(sx)<1.5 && abs(sz+.6)<3.)
         {   
            vec3 S = vec3(sx, -.2, sz);
            vec3 realLDir=normalize(LDir - S);
            color=(
                  0.5
                  +0.5*max(0.,realLDir.y)*LCol
               )*groundColor
            ;
            // + SPECULAR COMPONENT GOES HERE
            if(rtxoff || j == n_ref - 1)
               color += sqrt(float(j+1))*groundSpecular.xyz*
                  pow(max(0., dot(vec3(-realLDir.x, realLDir.y,-realLDir.z),-W)),groundSpecular.w);
            stack[j] = RT(color, 0.1);
            V = S;
            W = vec3(W.x, -W.y, W.z);
         }
         else{
            if(j > 0)
            {
               stack[j] = RT(sqrt(float(j+1))*vec3(4.,4.,4)*pow(max(0.,dot(W, normalize(LDir - V))), 10.), 0.);
               cnt_ref = j + 1;
            }
            else
               cnt_ref = j;

            break;
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
         if(i >= cnt_ref)
         {
            color += currks * stack[i - 1].color;
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
   