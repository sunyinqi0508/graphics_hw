
#define _DEBUG_BREAK {gl_FragColor=vec4(1,0,0,1); return;}
#define REFRACTION normalize(c2 >= 0.? (eta*W + (eta*c1 - sqrt(c2))*N) : ((W + c1*N)/sqrt(1.-c1*c1)))
vec3 foregroundColor = vec3(.0841, .5329, .9604);
vec3 groundColor = vec3(.2, .3, .5);
vec4 groundSpecular = vec4(.71, .71, .71, 10.);
uniform float uTime;// TIME, IN SECONDS
uniform int f_tex, f_rt, f_moved;
uniform float dFL; //DELTA on FOCAL LENGTH
uniform mat3 transformation, invTr;
uniform vec3 Ambient[ns], Diffuse[ns];
uniform vec4 Specular[ns];
uniform float ks[ns], kr[ns], kf[ns];
uniform vec4 Sph[ns];
uniform sampler2D uSampler[ns];

const float kf_air = 1.000293;
varying vec3 vPos;
float fl=3.;//ORIGINAL FOCAL LENGTH
const float pi=3.14159265359;
const float _2pi=2.*pi;

/***********PLEASE DO INCREASE n_ref(RT DEPTH) FOR BETTER RESULTS************/
/*---->*/const int n_ref=31; //2^n-1 because each hit now spawn at most 2 rays.
/**BUT BE CAUTIOUS IF YOU DON'T HAVE A DECENT GRAPHICS CARD (below GTX 950M)**/

const int max_stack = (n_ref+1)/4;

vec3 scolor = vec3(0,0,0); //Actually 2^n_ref
struct Ray{
   vec3 V;
   vec3 W;
   float kf, cumulativeK;
} stack1[max_stack], stack2[max_stack];
bool modulo2(int n){
   return n-2*(n/2) == 1;
}
vec2 getTextCoord(vec3 tex_sph, float R){
   float tex_x=atan(tex_sph.x,tex_sph.z)/_2pi + 0.5;//*Correct aspect ratio of texture 2:1 -> 2pir:2r
   tex_x=fract(tex_x+uTime/20.);
   return vec2(tex_x,-asin(tex_sph.y/R)/pi + 0.5);
}
void main(){
   vec3 LDir=vec3(.5,.5,.5);
   vec3 LCol=vec3(1.,1.,1.);
   float currKf = kf_air;
   vec3 color=vec3(.2, .3, .5);
   vec3 trPos = transformation*((dFL+fl+1.)/(fl+1.))*vec3(vPos.xy, -1);
   vec3 V0=transformation*vec3(0.,0.,fl+dFL), V = V0;
   vec3 W=(trPos-V);
   bool rtxoff = false, showtexture = true, moved = false;
   float currentK = 1.;
   int curr_ptr = 0, curr_top = 0, next_top = 0;
   bool final = false, stackswap = false, stop = false;
   for(int j=0;j<n_ref;j++)
   {
      for(int curr = 0; curr < max_stack; ++curr){
         if(curr == curr_ptr){
            bool skip = false;
            if(j > 0){
               Ray currR;
               if(stackswap)
                  currR = stack1[curr];
               else
                  currR = stack2[curr];
               currKf = currR.kf;
               currentK = currR.cumulativeK;
               if(currKf <= 0.001 || currentK <= 0.001)
                  skip = true; 
               V = currR.V;
               W = currR.W;
            }
            else 
               W = normalize(W);
            if(!skip){
               float tMin=10000.;
               int iMin = -1;
               for(int i=0;i<cns;i++){
                  vec3 Vp=V-Sph[i].xyz;
                  float B=dot(W,Vp);
                  float C=dot(Vp,Vp)-Sph[i].w*Sph[i].w;
                  float D=B*B-C;
                  if(D>0.){
                     float t=-B-sqrt(D);
                     if(t >= 0.01 && t < tMin){
                        tMin = t; // This is an optimization, we don't have to do lighting/tex
                        iMin = i; // for objects that are occuluded, which is expensive!
                     }
                     else if (t >= -0.01 && t <0.01){
                        t = -(t + 2.*B);
                        if(t > 0.01 && t < tMin){
                           tMin = t;
                           iMin = i;
                        }
                     }
                  }
               }

               if(iMin >= 0){
                  float t = tMin;
                  vec3 S=V+t*W;
                  for(int i = 0; i < cns; ++ i)
                     if(i == iMin)
                     {
                        vec3 texture_color;
                        if(showtexture)
                        {
                           vec3 tex_sph = (S-Sph[i].xyz);
                           texture_color=texture2D(uSampler[i],getTextCoord(tex_sph, Sph[i].w)).xyz;
                        }
                        else texture_color = foregroundColor;

                        vec3 N=normalize(S-Sph[i].xyz);
                        vec3 realLDir=normalize(LDir-S);
                        float c1 =dot(N, W);
                        float eta, nextkf;
                        if(c1<0.){
                           color=(Ambient[i]+Diffuse[i]*max(0.,dot(N,realLDir))*LCol)*texture_color;
                           if(rtxoff || final) //if it's the last hit
                           {
                              color +=  Specular[i].xyz*pow(max(0.,
                                 dot(-2.*c1*N-realLDir,realLDir)),Specular[i].w);
                              scolor += color * currentK;
                              break;
                           }
                           else{
                              c1 = -c1;
                              eta = currKf/kf[i];
                              nextkf = kf[i];
                           }
                        }
                        else{
                           N = -N;
                           eta = currKf/kf_air;
                           nextkf = kf_air;
                           color = Ambient[i];
                        }
                        float c2 = (1.-eta*eta*(1.-c1*c1));
                        float nextks = currentK * ks[i], nextkr = currentK * kr[i];
                        bool refl = nextks > 0.01, refr = nextkr > 0.01;
                        if(refl || refr)
                           for(int k = 0; k < max_stack; ++k)
                              if(k == next_top){
                                 if(stackswap){
                                    if(refl)
                                    {
                                       stack2[k] = Ray(S, 2. * c1 * N + W, currKf, nextks); //reflection
                                       currentK -= nextks;
                                       next_top ++;
                                    }
                                    if(refr)
                                    {
                                       if(refl)
                                          stack2[k+1] = Ray(S, REFRACTION, nextkf, nextkr); //refraction
                                       else
                                          stack2[k] = Ray(S, REFRACTION, nextkf, nextkr); //refraction
                                       currentK -= nextkr;
                                       next_top ++;
                                    }
                                 }else{
                                    if(refl)
                                    { //remember, c1 = -NW now
                                       stack1[k] = Ray(S, 2. * c1 * N + W, currKf, nextks); //reflection
                                       currentK -= nextks;
                                       next_top ++;
                                    }
                                    if(refr)
                                    {
                                       if(refl)
                                          stack1[k+1] = Ray(S, REFRACTION, nextkf, nextkr); //refraction
                                       else
                                          stack1[k] = Ray(S, REFRACTION, nextkf, nextkr); //refraction
                                       currentK -= nextkr;
                                       next_top ++;
                                    }
                                 }
                                 break;
                              }
                        scolor += color * currentK;
                        break;
                     }
               }
               else {
                  float t = -(.2+V.y)/W.y;
                  float sx = V.x + t* W.x, sz = V.z + t * W.z;

                  if(t >= 0. && abs(sx) < 1.5 && abs(sz) < 3.)
                  {
                     vec3 S = vec3(sx, -.2, sz);
                     vec3 realLDir=normalize(LDir - S);
                     color=(0.5+0.5*max(0.,realLDir.y)*LCol)*texture2D(uSampler[4],vec2((sx+1.4)/3., (sz+1.5)/4.)).xyz;
                     if(rtxoff || final&&abs(sx)<1.5 && abs(sz+.6)<3.)
                     {
                        color += groundSpecular.xyz* //specular for ground.
                           pow(max(0., dot(vec3(-realLDir.x, realLDir.y,-realLDir.z),-W)),groundSpecular.w);
                        scolor += currentK * color;
                     }
                     else
                     {
                        for(int k = 0; k < max_stack; ++k)
                           if(k == next_top){
                              if(stackswap)
                                 stack2[k] = Ray(S, vec3(W.x, -W.y, W.z), kf_air, currentK * 0.15); //reflection
                              else
                                 stack1[k] = Ray(S, vec3(W.x, -W.y, W.z), kf_air, currentK * 0.15); //reflection
                              next_top ++;
                              break;
                           }
                        scolor += (currentK*.85)*color;
                     }
                  }
                  else{
                     if(j > 0)
                        scolor += currentK * (pow(max(0.,dot(W, normalize(LDir - V))), 10.) * vec3(3.,3.,3.) + foregroundColor*0.1);
                     else scolor = foregroundColor*0.6;
                  }
               }
            }
            if(++curr_ptr >= curr_top){
               if(next_top <= 0)
                  stop = true;
               if(next_top * 2 > max_stack)
                  final = true;
               curr_top = next_top;
               next_top = 0;
               curr_ptr = 0;
               
               stackswap = !stackswap;
            }
            break;
         }
      }
      if(stop)
         break;
   }
   gl_FragColor=vec4(sqrt(scolor),1.);
}
