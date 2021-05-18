
vec3 foregroundColor = vec3(.0841, .5329, .9604);
uniform vec3 starColors[10];
uniform vec3 V0;
uniform sampler2D uSampler[ns + 1]; //ns + vs
varying vec3 norm;
varying float id;
varying vec3 glpos;
varying vec3 texPos;
vec3 LDir=vec3(.5,.5,.5);
void main(){
   vec3 color =foregroundColor.xyz;
   float sp = 0.4, df = 0.4, amb = 0.4, ex=5., alpha = 1.;
   vec3 l = vec3(1,1,1);
   float alp = 2.*abs(.49999 - fract(id+.00001));
   if(id < -2.5){gl_FragColor = vec4(texture2D(uSampler[ns + 0], (1.+texPos.xy)/2.).xyz, 1.); return;} //pjsk
   else if(id <-1.5) {color = vec3(.05,.05,.05);sp = 1.; df=.4; amb = .3, ex = 5.;}
   else if(id <-.5) {color = vec3(0.,1.,0.2034);}
   else if(id < 1.5) {color = vec3(1.0000, 0.3570, 0.3570);sp = 1.; df=.2; amb = .7, ex = 20.;}
   else if (id < 2.5) color = vec3(1.,.16,.36);
   else if (id < 3.5) {color = vec3(1.0000, 0.7725, 0.7725);sp = .5; df=.8; amb = .05;}
   else if (id < 4.5) {color = vec3(0.9612,0.3057,0.3369);sp = .5; df=.5; amb = .5; ex=20.;}
   else if (id < 6.5) {}
   else if (id < 7.5) {color = starColors[0]; sp = 0.3, df = 0.3, amb = 0.8, ex=5.;}
   else if (id < 8.5) {color = starColors[1]; sp = 0.05, df = 0.1, amb = 0.8, ex=10.,l = color;alp*=1.1;}
   else if (id < 9.5) {color = starColors[2]; sp = 0.5, df = 0.5, amb = 0.8, ex=10.,l = color;}
   else if (id < 10.5) {color = starColors[3]; sp = 0., df = 0., amb = 1., ex=10.,l = color;}
   else if (id < 12.5) {color = starColors[4]; sp = 0., df = 0., amb = 1., ex=10.,l = color;}
   else if (id < 13.5) {color = starColors[4]*2.; sp = 0., df = 0., amb = 1., ex=10.,l = color;}
   else if (id < 14.5) {
       color = .4*foregroundColor + .8*starColors[4]; sp = 0.5, df = 0.5, amb = 0.8, ex=10.,l = color;
        if(texPos.y > .3)
            color = vec3(1.,1.,1.);
   }
   else if (id < 15.5) {color = .3*vec3(0.9612,0.3057,0.3369)+.8*starColors[4]; sp = 0.5, df = 0.5, amb = 0.8, ex=10.,l = color;}
   else if (id < 16.5) {gl_FragColor=vec4(1.,1.,1., alp);return;}
   else if (id < 17.5) {color = vec3(.35,.35,.35);sp = .3; df=.6; amb = .1, ex = 1.;} 
   else if (id < 18.5) {
       color = vec3(.6,.29,.12);sp = .1; df=.2; amb = .7, ex = 1.;
       vec3 P = vec3(sin(texPos.y*1.), sin(texPos.x*1.5+1.),  cos(texPos.z*1.));
   // APPLY PROCEDURAL NOISE TEXTURE.
       float cloud = min(0.99, max(0., 1. * noise(.8 * P)));
       color =  (1.-cloud)*color + starColors[5] * cloud*3.;
    } 
   
   if(id < 0. &&id > -1.5){
       vec3 P = vec3(sin(glpos.y*1.), sin(glpos.x*1.5+1.),  cos(glpos.z*1.));
   // APPLY PROCEDURAL NOISE TEXTURE.
       float cloud = min(0.99, max(0., 1. * noise(1. * P)));
       color =  (1.-cloud)*color + starColors[5] * cloud*3.;
   }
   vec3 V = V0;
   vec3 W=normalize(glpos-V);
   vec3 realLDir=normalize(LDir - glpos);
   
   color = color*(amb+ df*max(0.,dot(norm,realLDir)))
                        + sp*pow(max(0., dot(2.*dot(norm, realLDir)*norm-realLDir, -W)),ex)*l;
   gl_FragColor=vec4(sqrt(color), alp);
}
