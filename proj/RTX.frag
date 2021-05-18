
#ifndef _NDEBUG
    precision highp float;
    const int ns = 5;
    const int cns = 5;
    float noise(vec3 v){return 1.;}
#endif
#define _DEBUG_BREAK {gl_FragColor=vec4(1,0,0,1); return;}
#define REFRACTION (c2 >= 0.? (eta*W + (eta*c1 - sqrt(c2))*N) : ((W + c1*N)/sqrt(1.-c1*c1)))
vec3 foregroundColor = vec3(.0841, .5329, .9604);
vec3 groundColor = vec3(.2, .3, .5);
vec4 groundSpecular = vec4(.71, .71, .71, 10.);
uniform float uTime;// TIME, IN SECONDS
uniform vec3 Ambient[ns], Diffuse[ns];
uniform vec4 Specular[ns];
uniform float ks[ns], kr[ns], kf[ns];
uniform vec4 Sph[ns];
uniform vec3 SphCanvas[ns];
uniform vec3 Glow[ns];
uniform sampler2D uSampler[ns+3];
uniform vec3 V0;
uniform bool glassy;
uniform int sel;
const float kf_air = 1.000293;
varying vec3 trPos;
varying float id;
varying vec3 norm;
varying vec3 texPos;
const float pi=3.14159265359;
const float _2pi=2.*pi;

/***********PLEASE DO INCREASE n_ref(RT DEPTH) FOR BETTER RESULTS************/
/*---->*/const int n_ref=31; //2^n-1 because each hit now spawn at most 2 rays.
/**BUT BE CAUTIOUS IF YOU DON'T HAVE A DECENT GRAPHICS CARD (below GTX 950M)**/

const int max_stack = (n_ref+1)/4;
vec3 scolor = vec3(0,0,0); 
struct Ray{
   vec3 V;
   vec3 W;
   float kf, cumulativeK, decay;
} stack1[max_stack], stack2[max_stack];
bool modulo2(int n){
   return n-2*(n/2) == 1;
}
vec2 getTextCoord(vec3 tex_sph, float R){
   float tex_x=atan(tex_sph.z,tex_sph.x)/_2pi + 0.5;//*Correct aspect ratio of texture 2:1 -> 2pir:2r
   tex_x=fract(tex_x+uTime/20.);
   return vec2(tex_x,-asin(tex_sph.y/R)/pi + 0.5);
}
#define clamp1(x) ((x)<0.?0.:((x) > 1. ? 1.:(x)))
vec3 vec_clamp01(vec3 x) {
   return vec3(clamp1(x.x), clamp1(x.y), clamp1(x.z));
}
void main(){
//   gl_FragColor=vec4(_glassy,0,0,1); return;
   vec3 LDir=vec3(.5,.5,.5);
   vec3 LCol=vec3(1.,1.,1.);
   float currKf = kf_air;
   vec3 color=vec3(.2, .3, .5);
   vec3 V = V0;
   vec3 W=(trPos-V);
   float glassyw = 1.;
//   bool glassy = _glassy > .1;
   if(glassy)
   {
      vec2 noiseTex = (texPos.xy + 1.)/2.;
      noiseTex = vec2(clamp1(noiseTex.x ), clamp1(noiseTex.y ));
      vec4 Wnoise = texture2D(uSampler[ns+2], noiseTex);
      W += (Wnoise.xyz-.5)*.4;
      glassyw = Wnoise.w;
   }
   bool selected = false;
   float currentK = 1.;
   float curr_decay = 1.;
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
               curr_decay = currR.decay;
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
                  if(j == 0 && iMin == sel)
                     selected = true;
                  vec3 S=V+tMin*W;
                  if(curr_decay > .01)
                     curr_decay = curr_decay/(1.+tMin*tMin);
                  for(int i = 0; i < cns; ++ i)
                     if(i == iMin)
                     {
                        if(j == 0)
                        {
                           float intensity = sqrt(dot(Glow[i], Glow[i]));
                           if(intensity > 1.7)
                           {
                              gl_FragColor = vec4(1.74*normalize(Glow[i]), 1.);
                              if(selected)
                                 gl_FragColor = vec4(normalize(Glow[i])+vec3(.5,0.,0.), 1.);
                              return;
                           }
                        }                        
                        
                        vec3 texture_color;
                        vec3 tex_sph = (S-Sph[i].xyz);
                        texture_color=texture2D(uSampler[i],getTextCoord(tex_sph, Sph[i].w)).xyz;

                        vec3 N=normalize(S-Sph[i].xyz);
                        vec3 realLDir=normalize(LDir-S);
                        float c1 =dot(N, W);
                        float eta, nextkf;
                        if(c1<0.){
                           color=(Ambient[i]+Diffuse[i]*max(0.,dot(N,realLDir))*LCol)*texture_color;
                           for(int k = 0; k < cns; ++k){
                           if(Glow[k].x > .01){
                              vec3 lDir = Sph[k].xyz - S;
                              float dist = length(lDir);
                              lDir /= (dist);
                              dist -= Sph[k].w;
                              color += (Glow[k]/(1.+dist*dist))*Diffuse[i]* 
                                 max(0.,dot(N,lDir));
                           }
                        }
                           if(final) //if it's the last hit
                           {
                              color +=  Specular[i].xyz*pow(max(0.,
                                 dot(-2.*c1*N-realLDir,realLDir)),Specular[i].w);
                              if(curr_decay > .01 && Glow[i].x > .01)
                              {
                                 vec3 glow_color = currentK*curr_decay*Glow[i];
                                 float l = length(glow_color);
                                 if(l >=1.7)
                                    glow_color/=l/1.7;
                                 scolor += glow_color;
                              }

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
                                       stack2[k] = Ray(S, 2. * c1 * N + W, currKf, nextks, curr_decay); //reflection
                                       currentK -= nextks;
                                       next_top ++;
                                    }
                                    if(refr)
                                    {
                                       if(refl)
                                          stack2[k+1] = Ray(S, REFRACTION, nextkf, nextkr, curr_decay); //refraction
                                       else
                                          stack2[k] = Ray(S, REFRACTION, nextkf, nextkr, curr_decay); //refraction
                                       currentK -= nextkr;
                                       next_top ++;
                                    }
                                 }else{
                                    if(refl)
                                    { //remember, c1 = -NW now
                                       stack1[k] = Ray(S, 2. * c1 * N + W, currKf, nextks, curr_decay); //reflection
                                       currentK -= nextks;
                                       next_top ++;
                                    }
                                    if(refr)
                                    {
                                       if(refl)
                                          stack1[k+1] = Ray(S, REFRACTION, nextkf, nextkr, curr_decay); //refraction
                                       else
                                          stack1[k] = Ray(S, REFRACTION, nextkf, nextkr, curr_decay); //refraction
                                       currentK -= nextkr;
                                       next_top ++;
                                    }
                                 }
                                 break;
                              }
                        scolor += color * currentK;
                        if(curr_decay > .01 && Glow[i].x > .01)
                        {
                           vec3 glow_color = currentK*curr_decay*Glow[i];
                           float l = length(glow_color);
                           if(l >=1.7)
                              glow_color/=l/1.7;
                           scolor += glow_color;
                        }

                        break;
                     }
               }
               else {
                  float t = -(.2+V.y)/W.y;
                  float sx = V.x + t* W.x, sz = V.z + t * W.z;

                  if(t >= 0. && abs(sx) < 1.5 && abs(sz) < 3.)
                  {
                     if(curr_decay > .01)
                        curr_decay = curr_decay/(1.+t*t);
                     vec3 S = vec3(sx, -.2, sz);
                     vec3 realLDir=normalize(LDir - S);
                     color=(0.5+0.5*max(0.,realLDir.y)*LCol)*texture2D(uSampler[ns], vec2((sx+1.5)/3., (sz+3.)/6.)).xyz;
                     if(final&&abs(sx)<1.5 && abs(sz+.6)<3.)
                     {
                        color += groundSpecular.xyz* //specular for ground.
                           pow(max(0., dot(vec3(-realLDir.x, realLDir.y,-realLDir.z),-W)),groundSpecular.w);
                        for(int k = 0; k < cns; ++k){
                           if(Glow[k].x > .01){
                              vec3 lDir = Sph[k].xyz - S;
                              float dist = length(lDir);
                              lDir /= (dist);
                              dist -= Sph[k].w;
                              color += (Glow[k]/(1.+dist*dist))* //specular for ground.
                                 pow(max(0., dot(vec3(-lDir.x, lDir.y,-lDir.z),-W)),groundSpecular.w);
                           }
                        }
                        scolor += currentK * color;
                     }
                     else
                     {
                        for(int k = 0; k < max_stack; ++k)
                           if(k == next_top){
                              if(stackswap)
                                 stack2[k] = Ray(S, vec3(W.x, -W.y, W.z), kf_air, currentK * 0.15, curr_decay); //reflection
                              else
                                 stack1[k] = Ray(S, vec3(W.x, -W.y, W.z), kf_air, currentK * 0.15, curr_decay); //reflection
                              next_top ++;
                              break;
                           }
                        scolor += (currentK*.85)*color;
                     }
                  }
                  else{
                     if(j > 0)
                     {
                        scolor += currentK * (pow(max(0.,dot(W, normalize(LDir - V))), 10.) * vec3(3.,3.,3.) + foregroundColor*0.1);
                        for(int k = 0; k < cns; ++k){
                           if(Glow[k].x > .01){
                              vec3 lDir = Sph[k].xyz - V;
                              float dist = length(lDir);
                              lDir /= (dist);
                              dist -= Sph[k].w;
                              color += (Glow[k]/(1.+dist*dist))* //specular for ground.
                                 pow(max(0., dot(vec3(-lDir.x, lDir.y,-lDir.z),W)),groundSpecular.w);
                           }
                        }
                     }
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

      
   if(glassy)
      scolor *= glassyw*glassyw;
   for(int i = 0; i < ns; ++i){
      if(i == sel)
         continue;
      vec2 sx = SphCanvas[i].xy - texPos.xy;
      float theta = atan(sx.y/sx.x);
      if(sx.x > 0. && theta < 0.)
         theta += _2pi;
      else if(sx.x < 0.)
         theta += pi;
      float intensity = sqrt(dot(Glow[i], Glow[i]));
      vec3 realD = Sph[i].xyz - V0;
      float realDist = sqrt(dot(realD, realD))-Sph[i].w;
      intensity/=(1.+realDist*realDist);
      float dist = dot(sx, sx) - SphCanvas[i].z*SphCanvas[i].z;
      intensity *= .5;
      if(dist < intensity && dist > 0.)
      {  
         vec3 flare = texture2D(uSampler[ns+1], vec2(0.1+0.9*(dist/intensity), theta/float(2*i+7))).xyz;
         scolor += flare*flare*Glow[i]/(1.+realDist*realDist); 
      }
   }
   scolor = vec_clamp01(scolor);
   if(selected)
      scolor.x += 0.5;
   gl_FragColor=vec4(sqrt(scolor),1.);
}
