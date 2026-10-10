import * as THREE from 'three';
import {PlaygroundTrails,TRAIL_IDS,TRAIL_CAPACITY,TRAIL_VALID} from './playground-trails.js';

export const TRAIL_STYLES=Object.freeze({
  head:{label:'Head',color:0xf6e597},torso:{label:'Torso',color:0xccb6ff},pelvis:{label:'Pelvis',color:0xf8f4ec},
  handL:{label:'L hand —',color:0x74dbff},handR:{label:'R hand - -',color:0xffb984},footL:{label:'L foot —',color:0x81e3bb},footR:{label:'R foot - -',color:0xff9caf}
});
const attribute=(size,itemSize)=>new THREE.BufferAttribute(new Float32Array(size),itemSize).setUsage(THREE.DynamicDrawUsage);
export class PlaygroundTrailView{
  constructor(scene,panel){
    this.scene=scene;this.panel=panel;this.collector=new PlaygroundTrails();this.objects=new Map();this.endpoints=null;this.disposed=false;this.lastVersion=-1;this.lastUi=0;
    this.seconds=3;this.monochrome=false;this.visible=new Set(['head','footL','footR']);
    this.onChange=ev=>{
      const key=ev.target.dataset.trail;if(!key||this.disposed)return;
      if(key==='enabled')this.collector.setEnabled(ev.target.checked);
      else if(key==='seconds')this.seconds=Number(ev.target.value);
      else if(key==='monochrome')this.monochrome=ev.target.checked;
      else if(TRAIL_IDS.includes(key)){if(ev.target.checked)this.visible.add(key);else this.visible.delete(key);}
      this.lastVersion=-1;this.update(performance.now(),true);
    };
    panel.addEventListener('change',this.onChange);
  }
  rebind(session){this.collector.rebind(session);this.lastVersion=-1;this.update(performance.now(),true);}
  line(id){
    if(this.objects.has(id))return this.objects.get(id);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',attribute((TRAIL_CAPACITY-1)*6,3));geometry.setAttribute('color',attribute((TRAIL_CAPACITY-1)*6,3));geometry.setAttribute('lineDistance',attribute((TRAIL_CAPACITY-1)*2,1));geometry.setDrawRange(0,0);
    const right=id.endsWith('R'),material=right?new THREE.LineDashedMaterial({vertexColors:true,dashSize:.025,gapSize:.015,transparent:true,opacity:.85,depthTest:false}):new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.85,depthTest:false});
    const line=new THREE.LineSegments(geometry,material);line.name='trail-'+id;line.frustumCulled=false;line.renderOrder=3;this.scene.add(line);this.objects.set(id,line);return line;
  }
  endpointObject(){
    if(this.endpoints)return this.endpoints;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',attribute(TRAIL_IDS.length*3,3));geometry.setAttribute('color',attribute(TRAIL_IDS.length*3,3));geometry.setDrawRange(0,0);
    this.endpoints=new THREE.Points(geometry,new THREE.PointsMaterial({size:6,sizeAttenuation:false,vertexColors:true,depthTest:false}));this.endpoints.name='trail-endpoints';this.endpoints.frustumCulled=false;this.endpoints.renderOrder=4;this.scene.add(this.endpoints);return this.endpoints;
  }
  removeObjects(){for(const object of [...this.objects.values(),...(this.endpoints?[this.endpoints]:[])]){this.scene.remove(object);object.geometry.dispose();object.material.dispose();}this.objects.clear();this.endpoints=null;}
  draw(){
    const c=this.collector;if(!c.enabled){this.removeObjects();return;}
    const endpoint=this.endpointObject(),ep=endpoint.geometry.attributes.position,ec=endpoint.geometry.attributes.color;let endCount=0;
    for(const id of TRAIL_IDS){
      if(!this.visible.has(id)){const object=this.objects.get(id);if(object)object.visible=false;continue;}
      const object=this.line(id),g=object.geometry,p=g.attributes.position,col=g.attributes.color,d=g.attributes.lineDistance;
      object.visible=true;const base=new THREE.Color(this.monochrome?0xe7eef2:TRAIL_STYLES[id].color);let previous=-1,previousStep=0,vertices=0,distance=0,last=-1;
      c.visit(id,this.seconds,(slot,step,flag,array)=>{
        if(!(flag&TRAIL_VALID)){previous=-1;last=-1;return;}
        const offset=slot*3;
        if(previous>=0){
          const nextDistance=distance+Math.hypot(array[offset]-array[previous],array[offset+1]-array[previous+1],array[offset+2]-array[previous+2]);
          p.setXYZ(vertices,array[previous],array[previous+1],array[previous+2]);let fade=.2+.8*Math.max(0,1-((c.lastStep??step)-previousStep)/(this.seconds*60));col.setXYZ(vertices,base.r*fade,base.g*fade,base.b*fade);d.setX(vertices,distance);vertices++;
          p.setXYZ(vertices,array[offset],array[offset+1],array[offset+2]);fade=.2+.8*Math.max(0,1-((c.lastStep??step)-step)/(this.seconds*60));col.setXYZ(vertices,base.r*fade,base.g*fade,base.b*fade);d.setX(vertices,nextDistance);vertices++;
          distance=nextDistance;
        }
        previous=offset;previousStep=step;last=offset;
      });
      g.setDrawRange(0,vertices);p.needsUpdate=col.needsUpdate=d.needsUpdate=true;
      if(last>=0){const array=c.positions.get(id);ep.setXYZ(endCount,array[last],array[last+1],array[last+2]);ec.setXYZ(endCount,base.r,base.g,base.b);endCount++;}
    }
    endpoint.geometry.setDrawRange(0,endCount);ep.needsUpdate=ec.needsUpdate=true;
  }
  update(ms,force=false){
    if(this.disposed)return;
    if(this.lastVersion!==this.collector.version){this.draw();this.lastVersion=this.collector.version;}
    if(force||ms-this.lastUi>=100){this.lastUi=ms;const c=this.collector,status=this.panel.querySelector('#trailStatus');
      status.textContent=c.enabled?`${c.count} / 600 steps · ${this.seconds} s view${c.lastStep===0?' · initial pose':c.lastStep===null?' · waiting for next step':' · #'+c.lastStep}${c.safety?' · Safety endpoint':''}${c.gaps?' · gaps: '+c.gaps:''}`:'Trails OFF · history cleared';
    }
  }
  snapshot(includePositions=false){return {...this.collector.snapshot(includePositions),seconds:this.seconds,monochrome:this.monochrome,visible:[...this.visible],resources:this.objects.size+(this.endpoints?1:0),bufferBytes:[...this.objects.values(),...(this.endpoints?[this.endpoints]:[])].reduce((sum,object)=>sum+Object.values(object.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0)};}
  dispose(){if(this.disposed)return;this.disposed=true;this.panel.removeEventListener('change',this.onChange);this.collector.dispose();this.removeObjects();}
}
