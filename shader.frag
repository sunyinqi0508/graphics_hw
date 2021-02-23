
uniform float uTime;// TIME, IN SECONDS
uniform int flags;
//FLAGS 0-RT, 1-TEX, 2-
varying vec3 vPos;// -1 < vPos.x < +1
// -1 < vPos.y < +1
//      vPos.z == 0

float fl=3.;
const float pi=3.14159265359;
const int n_ref=10;
const int ns=2;
vec4 Sph[ns];
uniform sampler2D uSampler[ns];
vec3 Ambient[ns];
vec3 Diffuse[ns];
vec4 Specular[ns];

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
   
   Ambient[0]=vec3(.1,.05,.05);// r,g,b
   Diffuse[0]=vec3(1.,.5,.5);// r,g,b
   Specular[0]=vec4(1.,.5,.5,10.);// r,g,b,power
   
   Ambient[1]=vec3(.05,.05,.1);// r,g,b
   Diffuse[1]=vec3(.5,.5,1.);// r,g,b
   Specular[1]=vec4(1.,.5,.5,20.);// r,g,b,power
   
   // INITIALIZE TO A BACKGROUND COLOR
   
   vec3 color=vec3(.2, .3, .5);
   
   // COMPUTE THE RAY ORIGIN AND DIRECTION
   float x=vPos.x;
   float y=vPos.y;
   
   vec3 V=vec3(0.,0.,fl);
   vec3 W=normalize(vec3(x,y,-fl));
   // RAY TRACE TO ALL OBJECTS IN THE SCENE
   
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
      float t = tMin;
      vec3 S=V+t*W;
      for(int i = 0; i < ns; ++ i)
         if(i == iMin)
         {
            //*TEXTURE MAPPING
            vec3 tex_sph=S-Sph[i].xyz;
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
            
            vec3 N=normalize(S-Sph[i].xyz);
            vec3 VDir=normalize(V-Sph[i].xyz);
            //*DIRECTIONS ARE NORMALIZED TO GET THE CORRECT PHONG LIGHTING
            vec3 realLDir=normalize(LDir-S);
            color=(
                  Ambient[i]
                  +Diffuse[i]*max(0.,dot(N,realLDir))*LCol
               )*texture_color
               // + SPECULAR COMPONENT GOES HERE
               +Specular[i].xyz*pow(max(0.,dot(2.*dot(N,realLDir)*N-realLDir,VDir)),Specular[i].w)
            ;
            break;
         }       
         if(getflag(flags, 1))
            break;
   }
   // APPLY GAMMA CORRECTION AND SET THE PIXEL COLOR.
   gl_FragColor=vec4(sqrt(color),1.);
}
   