let lerp = (a,b,t) => a + t * (b - a); // LINEAR INTERPOLATION

let N = 0; // GREATER N INCREASES "NERVOUSNESS" OF BIG OBJECT

// TIMING TABLE FOR THE ANIMATION SEQUENCE

let timing = [
   [0, lerp(1,.5,N)],
   [1.8, lerp(2.3,2.1,N)], 
   [lerp(2,2.5,N), 2.8],
   [2.0, 3.2],
   [3.4, 3.9],
   [4.3, 5.0],
];

// EASE CURVE TO ACCELERATE FROM REST AND THEN DECELERATE TO REST

let sCurve = t => (3 - 2 * t) * t * t;
let jCurve =  t => t*t*t*t;
let jCurve3 = t => t*t*t;
// EVALUATE THE TIMING OF ONE ANIMATION PARAMETER FOR THIS FRAME

let evalTiming = n => {
   let t0 = timing[n][0];
   let t1 = timing[n][1];

   if (animationTime < t0)
      return 0;
   if (animationTime > t1)
      return 1;
   return sCurve((animationTime - t0) / (t1 - t0));
}


let bounce = t => Math.sin(Math.PI * t);
let wiggle = t => Math.sin(6 * Math.PI * t);

let trees = []

function add_tree(pos) {
    trees.append(new Float32Array(pos))
    createMesh(32,32,uvToCone,-1, 20);
}

class State {
    constructor(idx = 0, step = 1) {
        this.leg = true;
        this.progress = 0;
        this.rh = this.lh = .5 * pi;
        this.lf = this.rf = 0;
        this.running = 0;
        this.direction_l = [0, 0];
        this.dir_sdl = 0;
        this.delta_l = [0, 0];
        this.wiggle_t = 0;
        this.punch_t = 1;
        this.idx = idx;
        if(rebuild[idx] === undefined)
            rebuild.push(true);
        states[this.idx] = this;
        this.fig_rot_t = 0;
        this.figure_rot = pi;
        this.old_figure_rot = pi;
        this.curr_figure_rot = pi;
        this.target_figure_rot = pi;
        this.delta_height = 0;
        this.delta = const_multiply(step, [-.7*pi , 0.5 * pi, 0.44 * pi, 0.55 * pi]);
        this.stepSize = step;
        this.turnStep = .1;
        this.stepLength = this.stepSize*(1.8522);
        this.life = 3;
        this.damage = .05;
        this.dead = false;
        this.death_t = 0;
        this.hitID = 19;
    }
    reset(){
        this.running = 0;    
        this.leg = true;
        this.progress = 0;
        this.delta_height = 0;
        this.dir_sdl = 0;
        this.rh = this.lh = .5 * pi;
        this.lf = this.rf = 0;
        this.dead = false;
        this.wiggle_t = 0;
        this.death_t = 0;        
    }
    initialize() {
        this.figure_rot = pi;
        this.old_figure_rot = pi;
        this.curr_figure_rot = pi;
        this.target_figure_rot = pi;
        this.reset();
        this.wiggle_t = 0;
        this.punch_t = 1;
        this.fig_rot_t = 0;
        this.direction_l = [0, 0];
        this.delta_l = [0, 0];
        this.life = 3;
        this.delta_l = [0,0];
        this.direction_l = [0, 0];
        this.dir_sdl = 0;
    }
    set_stepSize(step){
        this.delta = const_multiply(step, [-.7*pi , 0.5 * pi, 0.44 * pi, 0.55 * pi]);
        this.stepSize = step;
        this.stepLength = this.stepSize*(1.8522);
    }
    hitTest(punchProg){
        states.forEach((st, i)=>{
            if(i != this.idx){
                //1.15=.5*.23*10; .92 = .4*.23*10 .23=figure_scale, 10=overall_scale
                const armlength = 1.15*cos(punchProg*pi/4)+.92*cos(-.53*pi*punchProg)
                let dir = normalize(this.direction_l);
                let punchpos = plus(plus(this.delta_l, 
                    const_multiply(.3, [dir[1],-dir[0]])),
                    const_multiply(armlength, dir));
                if(vec_len(minus(punchpos, st.delta_l)) < .65){
                    st.hit(this);
                }
            }
        });
    }
    start_punch(){
        if(this.punch_t >= 1){
            this.punch_t = 0;
            rebuild[this.idx] = true;
        }
    }
    punch(){
        if(this.punch_t < 1)
        {
            rebuild[this.idx] = true;
            this.punch_t+=.05;
            if(this.punch_t <= .05)
                return 1.2;
            else 
            {
                let punchProg;
                if(this.punch_t <= .4)
                    punchProg = 1.2*(1-jCurve((this.punch_t- .05)/.35));
                else 
                    punchProg = 1-jCurve(2-2*(this.punch_t+.1)/1.1);
                if(this.hitTest(punchProg))
                    this.punch_t = 1;
                return punchProg;
            }
        }
        return 1;
    }
    restoreID(st){
        objects[st.idx].forEach(
            (obj, i)=>{
                changeID(st.orig_objid[i], obj[0]);
            }
        )
    }
    defaultHit(){
        if(objects[this.idx][0][0][0] != this.hitID){
            this.orig_objid = [];
            objects[this.idx].forEach(
                (obj, i) => {
                    this.orig_objid[i] = (obj[0])[0];
                }
            )
            objects[this.idx].forEach(
                (obj, i) => {
                    changeID(this.hitID, obj[0]);
                }
            )
            setTimeout(this.restoreID, 100, this);
        }
        if(this.dead&&this.wiggle_t<=0){
            rebuild[this.idx] = true;
            this.wiggle_t = 2.5;
        }
        else if(this.life > 0)
        {
            this.life -= this.damage;
        }
        else {
            this.death();
        }
    }
    defaultDeath(){
        this.dead = true;
        this.death_t = 1;
        rebuild[this.idx] = true;
    }
    hit(hitter){this.defaultHit(hitter);}
    death() {if(!this.dead){this.defaultDeath();}}
    animated_turn(){
        if(this.target_figure_rot != this.figure_rot)
        {
           this.fig_rot_t = 1;
           this.figure_rot %= 2*pi;
           if(this.figure_rot < 0) this.figure_rot += 2*pi;
           this.curr_figure_rot %= 2*pi;
           if(this.curr_figure_rot < 0) this.curr_figure_rot += 2*pi;
           if((this.curr_figure_rot - this.figure_rot) > pi)
              this.curr_figure_rot -= 2*pi;
           else if (this.curr_figure_rot - this.figure_rot < -pi)
              this.figure_rot -= 2*pi;
           this.old_figure_rot = this.curr_figure_rot;
           this.target_figure_rot = this.figure_rot;
        }
        if(this.fig_rot_t > 0)
        {
           this.fig_rot_t-=this.turnStep;
           this.curr_figure_rot = lerp(
              this.old_figure_rot, this.figure_rot, sCurve(1-this.fig_rot_t));
        }
    }
    turn(pt, animated = true){
        this.direction_l = [pt[0] - this.delta_l[0]/10, pt[1] - this.delta_l[1]/10];
        if(this.direction_l[1] == 0)
            this.direction_l[1] = 0.0000000000000001;
        this.figure_rot =  atan(this.direction_l[0]/this.direction_l[1]);
        if(this.direction_l[1] < 0)
            this.figure_rot = pi + this.figure_rot; 
        if(!animated)
        {    
            this.curr_figure_rot = this.target_figure_rot = this.figure_rot;
            this.fig_rot_t = 0;
        }
    }
    walk(){
        this.dir_sdl = vec_len(this.direction_l)*10;
        this.direction_l = normalize(this.direction_l);
        rebuild[this.idx] = true;
        this.running = 1;
    }
    next() {
       //return this.presentation();
       if (this.running <= 0)
       {   
            this.reset();
            return {
                rh: .5 * pi,
                lh: .5 * pi,
                rf: 0,
                lf: 0,
                dh: 0,
                dl: 0
            }
        }
       this.running--;
       const steps = 28;
       let dl = 0;
       if (this.progress >= steps / 2) {
          this.progress = 0;
          this.leg = !this.leg;
       }
       let delta = deepcopy(this.delta);
       for (let i = 0; i < 4; ++i) delta[i] /= steps;
       if (this.leg) {
          if (this.progress < steps / 4) {
             this.lh += delta[0];
             this.rh += delta[3];
             this.lf += delta[1];
             this.rf += delta[2];
          } else {
             this.lh -= delta[0];
             this.rh -= delta[3];
             this.lf -= delta[1];
             this.rf -= delta[2];
          }
       } else {
          if (this.progress < steps / 4) {
             this.lh += delta[3];
             this.rh += delta[0];
             this.lf += delta[2];
             this.rf += delta[1];
          } else {
             this.lh -= delta[3];
             this.rh -= delta[0];
             this.lf -= delta[2];
             this.rf -= delta[1];
          }
       }
       let delta_h = Math.max((1 - cos(abs(this.lh - pi / 2))) * .5 + (1 - cos(abs(this.lf))) * .6, (1 - cos(abs(this.rh - pi / 2))) * .5 + (1 - cos(abs(this.rf))) * .6);
       this.progress++;
       return {
          lh: this.lh,
          lf: this.lf,
          rh: this.rh,
          rf: this.rf,
          dh: delta_h,
          dl: this.stepLength / steps
       };
    }
    presentation(){
       return {lh:.4*pi, lf:pi/6,rh:.7*pi, rf:pi/8, dh:0, dl: 0};
    }
 };

function update_tree(idx){
    //scale, add leaves, add branch

}