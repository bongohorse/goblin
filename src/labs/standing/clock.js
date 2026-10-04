// Lab-local clock, independent of gameplay runtime and round timers.
export class LabClock {
  constructor(dt,maxSteps=3){this.dt=dt;this.maxSteps=maxSteps;this.reset();}
  reset(){this.previous=null;this.accumulator=0;}
  advance(now,paused,tick){
    if(paused){this.reset();return 0;}
    if(this.previous===null){this.previous=now;return 0;}
    this.accumulator+=Math.max(0,Math.min(this.dt*this.maxSteps,now-this.previous));this.previous=now;
    let n=0;while(this.accumulator+1e-12>=this.dt&&n<this.maxSteps){tick();this.accumulator=Math.max(0,this.accumulator-this.dt);n++;}
    return n;
  }
}
