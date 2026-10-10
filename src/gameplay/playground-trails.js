// Read-only native Body.translation(), world metres, one entry per executed 1/60 s step.
export const TRAIL_IDS=Object.freeze(['head','torso','pelvis','handL','handR','footL','footR']);
export const TRAIL_CAPACITY=600;
export const TRAIL_VALID=1,TRAIL_INITIAL=2,TRAIL_TERMINAL=4;

export class PlaygroundTrails{
  constructor(){
    this.enabled=false;this.session=null;this.unsubscribe=null;this.disposed=false;
    this.steps=new Float64Array(TRAIL_CAPACITY);
    this.positions=new Map(TRAIL_IDS.map(id=>[id,new Float64Array(TRAIL_CAPACITY*3)]));
    this.flags=new Map(TRAIL_IDS.map(id=>[id,new Uint8Array(TRAIL_CAPACITY)]));
    this.clear();
  }
  clear(){this.count=0;this.next=0;this.lastStep=null;this.safety=null;this.gaps=0;this.version=(this.version||0)+1;}
  rebind(session){
    this.unsubscribe?.();this.unsubscribe=null;this.session=session;this.clear();
    if(this.enabled)this.subscribe();
  }
  subscribe(){
    if(!this.session||this.disposed)return;
    this.unsubscribe=this.session.observeSteps({step:()=>this.sample(),reset:()=>{this.clear();this.initial();},dispose:()=>{this.unsubscribe=null;this.session=null;this.clear();}});
    this.initial();
  }
  initial(){if(this.session?.sim.steps===0&&this.count===0)this.sample(true);}
  setEnabled(enabled){
    if(this.disposed||enabled===this.enabled)return;
    this.enabled=enabled;this.unsubscribe?.();this.unsubscribe=null;this.clear();
    if(enabled)this.subscribe();
  }
  sample(initial=false){
    const sim=this.session?.sim;if(!this.enabled||!sim||sim.steps===this.lastStep)return;
    const slot=this.next,terminal=sim.invalid?TRAIL_TERMINAL:0;
    this.steps[slot]=sim.steps;this.safety=sim.invalid||null;
    for(const id of TRAIL_IDS){
      const p=sim.rig.byId.get(id)?.body.translation(),array=this.positions.get(id);
      const valid=p&&Number.isFinite(Math.fround(p.x))&&Number.isFinite(Math.fround(p.y))&&Number.isFinite(Math.fround(p.z));
      this.flags.get(id)[slot]=(valid?TRAIL_VALID:0)|(initial?TRAIL_INITIAL:0)|terminal;
      // Never retain a NaN for GPU upload; flags describe a real missing step.
      array[slot*3]=valid?p.x:0;array[slot*3+1]=valid?p.y:0;array[slot*3+2]=valid?p.z:0;
      if(!valid)this.gaps++;
    }
    this.lastStep=sim.steps;this.next=(slot+1)%TRAIL_CAPACITY;this.count=Math.min(TRAIL_CAPACITY,this.count+1);this.version++;
  }
  slot(index){return (this.next-this.count+index+TRAIL_CAPACITY)%TRAIL_CAPACITY;}
  visit(id,seconds,callback){
    const cutoff=(this.lastStep??0)-seconds*60;
    for(let i=0;i<this.count;i++){const slot=this.slot(i),step=this.steps[slot];if(step>=cutoff)callback(slot,step,this.flags.get(id)[slot],this.positions.get(id));}
  }
  snapshot(includePositions=false){
    const lines=TRAIL_IDS.map(id=>{
      const points=[];if(includePositions)this.visit(id,10,(slot,step,flag,array)=>points.push({step,time_s:step/60,initial:!!(flag&TRAIL_INITIAL),terminal:!!(flag&TRAIL_TERMINAL),position:flag&TRAIL_VALID?Array.from(array.subarray(slot*3,slot*3+3)):null}));
      return {id,...(includePositions?{points}:{})};
    });
    return {enabled:this.enabled,reference:'native body transform origin',frame:'world',unit:'m',dt_s:1/60,capacity:TRAIL_CAPACITY,count:this.count,
      oldestStep:this.count?this.steps[this.slot(0)]:null,lastStep:this.lastStep,safety:this.safety,gaps:this.gaps,
      storageBytes:this.steps.byteLength+[...this.positions.values(),...this.flags.values()].reduce((sum,a)=>sum+a.byteLength,0),lines};
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.unsubscribe?.();this.unsubscribe=null;this.session=null;this.enabled=false;this.clear();this.positions.clear();this.flags.clear();this.steps=null;}
}
