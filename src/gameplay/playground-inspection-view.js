import * as THREE from 'three';
import R from '@dimforge/rapier3d-compat';
import {BODY_LABELS,readInspection,jointSegments,readJointGeometry,formatGap} from './playground-inspection.js';

// Read native collider dimensions, not render-mesh dimensions. Rapier debugRender also
// emits joint/axis lines and cannot separate those with its public JS filter in 0.21.0.
export function colliderOutline(collider){
  const shape=collider.shape;let geometry;
  if(shape.type===R.ShapeType.Ball)geometry=new THREE.SphereGeometry(shape.radius,12,8);
  else if(shape.type===R.ShapeType.Capsule)geometry=new THREE.CapsuleGeometry(shape.radius,shape.halfHeight*2,4,8);
  else if(shape.type===R.ShapeType.Cuboid){const h=shape.halfExtents;geometry=new THREE.BoxGeometry(h.x*2,h.y*2,h.z*2);}
  else throw Error('Unsupported collider shape in Playground inspection');
  const wire=shape.type===R.ShapeType.Cuboid?new THREE.EdgesGeometry(geometry):new THREE.WireframeGeometry(geometry);
  const values=wire.getAttribute('position').array.slice();wire.dispose();geometry.dispose();return values;
}
const fmt=n=>Number(n).toFixed(3);
const value=f=>f?.value===null?'Unavailable':typeof f.value==='object'?Object.entries(f.value).map(([k,v])=>`${k}: ${fmt(v)}`).join(' · '):fmt(f.value);
const vectorDefinitions={linear_velocity:{color:0x66ff99,scale:.25,caption:'Linear velocity: 0.25 m per m/s'},angular_velocity:{color:0x7daaff,scale:.15,caption:'Angular velocity: 0.15 m per rad/s'},external_force:{color:0xffb74d,scale:.003,caption:'External force command: 0.003 m per N'},external_torque:{color:0xff77cf,scale:.025,caption:'External torque command: 0.025 m per Nm'}};

export class PlaygroundInspectionView{
  constructor(scene,meshes,{floor,grid,material,feetMaterial},panel){
    this.scene=scene;this.meshes=meshes;this.floor=floor;this.grid=grid;this.materials=[material,feetMaterial];this.panel=panel;
    this.objects=new Map();this.selected=null;this.selectedJoint=null;this.localOutlines=null;this.lastUi=0;this.disposed=false;
    this.settings={mesh:true,wireframe:false,colliders:false,joints:false,anchorGap:false,floor:true,grid:true,velocity:false,commands:false};this.jointSample=null;
    this.selectBody=panel.querySelector('#inspectBody');this.selectJoint=panel.querySelector('#inspectJoint');
    for(const [id,label] of Object.entries(BODY_LABELS)){const option=document.createElement('option');option.value=id;option.textContent=label;this.selectBody.append(option);}
    this.onChange=ev=>{
      if(this.disposed)return;
      const key=ev.target.dataset.inspection;if(key){this.settings[key]=ev.target.checked;this.jointSample=null;this.apply();this.update(this.sim,performance.now(),true);}
      if(ev.target===this.selectBody)this.select(this.selectBody.value||null);
      if(ev.target===this.selectJoint){this.selectedJoint=this.selectJoint.value||null;this.update(this.sim,performance.now(),true);}
    };
    panel.addEventListener('change',this.onChange);this.apply();
  }
  line(id,color,capacity){
    if(this.objects.has(id))return this.objects.get(id);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(capacity),3).setUsage(THREE.DynamicDrawUsage));geometry.setDrawRange(0,0);
    const material=new THREE.LineBasicMaterial({color,depthTest:false,depthWrite:false});
    const object=new THREE.LineSegments(geometry,material);object.frustumCulled=false;object.renderOrder=12;this.scene.add(object);this.objects.set(id,object);return object;
  }
  remove(id){const o=this.objects.get(id);if(!o)return;o.removeFromParent();o.geometry.dispose();o.material.dispose();this.objects.delete(id);}
  fill(id,values){const o=this.objects.get(id),p=o.geometry.getAttribute('position');if(values.length>p.array.length)throw Error('Inspection line capacity exceeded');p.array.set(values);p.needsUpdate=true;o.geometry.setDrawRange(0,values.length/3);}
  apply(){
    for(const m of this.meshes.values())m.visible=this.settings.mesh;
    for(const material of this.materials)material.wireframe=this.settings.wireframe;
    this.floor.visible=this.settings.floor;this.grid.visible=this.settings.grid;
    if(!this.settings.colliders){this.remove('colliders');this.localOutlines=null;}
    if(!this.settings.joints&&!this.settings.anchorGap)this.remove('joints');
    for(const key of Object.keys(vectorDefinitions))if(!this.settings[key.includes('velocity')?'velocity':'commands'])this.remove(key);
  }
  select(id){
    this.selected=id;this.selectedJoint=null;this.selectBody.value=id||'';this.lastUi=0;
    this.selectJoint.replaceChildren(new Option('All connected joints',''));
    if(id)for(const joint of this.sim.rig.byId.get(id).joints)this.selectJoint.append(new Option(joint,joint));
    this.remove('highlight');this.remove('selectedJoint');
    if(id){const highlight=new THREE.BoxHelper(this.meshes.get(id),0xffffff);highlight.material.depthTest=false;highlight.material.depthWrite=false;highlight.renderOrder=13;this.scene.add(highlight);this.objects.set('highlight',highlight);}
    this.update(this.sim,performance.now(),true);
  }
  rebind(sim){
    for(const id of [...this.objects.keys()])this.remove(id);
    this.sim=sim;this.selected=null;this.selectedJoint=null;this.localOutlines=null;this.data=null;this.jointSample=null;
    this.selectBody.value='';this.selectJoint.replaceChildren(new Option('All connected joints',''));this.lastUi=0;this.apply();this.update(sim,performance.now(),true);
  }
  update(sim,ms,force=false){
    if(this.disposed)return;this.sim=sim;
    const refresh=force||(this.settings.anchorGap&&!this.jointSample)||ms-this.lastUi>=100||this.jointSample?.step>sim.steps||this.lastRunState!==`${sim.state}:${sim.invalid}`;
    if(this.settings.anchorGap&&refresh)this.jointSample=readJointGeometry(sim);
    this.lastRunState=`${sim.state}:${sim.invalid}`;
    if(this.settings.colliders){
      if(!this.localOutlines)this.localOutlines=[...sim.rig.byId.values()].map(({spec,collider})=>({id:spec.id,values:colliderOutline(collider)}));
      this.line('colliders',0x42e8ff,this.localOutlines.reduce((n,o)=>n+o.values.length,0));
      const vertices=[],v=new THREE.Vector3();
      for(const {id,values} of this.localOutlines){const c=sim.rig.byId.get(id).collider,p=c.translation(),q=c.rotation();
        for(let i=0;i<values.length;i+=3){v.set(values[i],values[i+1],values[i+2]).applyQuaternion(q).add(p);vertices.push(v.x,v.y,v.z);}}
      this.fill('colliders',vertices);
    }
    if(this.settings.joints||this.settings.anchorGap){
      const sample=this.settings.anchorGap?this.jointSample:null;
      const line=this.line('joints',0xffffff,sim.entries.length*30);
      line.material.color.setHex(sample?0xffffff:0xffe16c);line.material.vertexColors=!!sample;
      if(line.userData.vertexColors!==!!sample){line.material.needsUpdate=true;line.userData.vertexColors=!!sample;}
      if(sample){
        if(!line.geometry.getAttribute('color'))line.geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(sim.entries.length*30),3).setUsage(THREE.DynamicDrawUsage));
        if(refresh){const colors=line.geometry.getAttribute('color'),color=new THREE.Color();
          for(const j of sample.joints){color.setHex(j.level.color);for(let i=j.start;i<j.start+j.count;i++)colors.setXYZ(i,color.r,color.g,color.b);}colors.needsUpdate=true;
          this.fill('joints',sample.vertices);}
      }else this.fill('joints',jointSegments(sim.rig));
    }
    if(!this.settings.anchorGap||refresh)this.data=this.selected?readInspection(sim,this.selected,this.settings.anchorGap?this.jointSample:null):null;
    if(this.data){
      this.objects.get('highlight')?.update();
      const joint=this.data.joints.find(j=>j.id===this.selectedJoint);
      if(joint?.anchors){const {a,b}=joint.anchors;this.line('selectedJoint',0xffffff,18);this.fill('selectedJoint',[a.x-.06,a.y,a.z,a.x+.06,a.y,a.z,a.x,a.y-.06,a.z,a.x,a.y+.06,a.z,...(this.settings.anchorGap?[b.x-.04,b.y,b.z,b.x+.04,b.y,b.z]:[a.x,a.y,a.z,b.x,b.y,b.z])]);}else this.remove('selectedJoint');
      for(const [key,def] of Object.entries(vectorDefinitions))if(this.settings[key.includes('velocity')?'velocity':'commands']){
        this.line(key,def.color,18);if(this.data.pose.position.value===null||this.data[key].value===null){this.fill(key,[]);continue;}
        const origin=new THREE.Vector3().copy(this.data.pose.position.value),dir=new THREE.Vector3().copy(this.data[key].value),length=Math.min(2,dir.length()*def.scale);
        if(length<1e-6){this.fill(key,[]);continue;}dir.normalize();const end=origin.clone().addScaledVector(dir,length),side=new THREE.Vector3().crossVectors(dir,Math.abs(dir.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize();
        const back=end.clone().addScaledVector(dir,-Math.min(.12,length*.3)),a=back.clone().addScaledVector(side,.04),b=back.clone().addScaledVector(side,-.04);
        this.fill(key,[...origin.toArray(),...end.toArray(),...end.toArray(),...a.toArray(),...end.toArray(),...b.toArray()]);
      }
    }else for(const key of Object.keys(vectorDefinitions))this.remove(key);
    if(refresh){this.lastUi=ms;this.renderText();}
  }
  renderText(){
    const target=this.panel.querySelector('#inspectionValues');
    const status=this.panel.querySelector('#anchorGapStatus');
    if(status){status.textContent=this.settings.anchorGap?`Derived geometry · step ${this.jointSample.step} / ${fmt(this.jointSample.time_s)} s`:'Anchor gap: OFF';status.dataset.step=this.settings.anchorGap?this.jointSample.step:'';}
    const reading=this.panel.querySelector('#anchorGapReading');
    if(reading){reading.hidden=!this.settings.anchorGap;const joint=this.jointSample?.joints.find(j=>j.id===this.selectedJoint);reading.textContent=joint?`${joint.id} · ${formatGap(joint.anchor_gap.value)} · ${joint.level.label}`:'Select a connected joint for its value.';}
    if(!this.data){target.textContent='Select a body to inspect.';delete target.dataset.rows;return;}
    const d=this.data,rows=[['Body / step',`${BODY_LABELS[d.body_id]} (${d.body_id}) · ${d.step} / ${fmt(d.time_s)} s`],['Run',`${d.run.state} · ${d.run.reason} · safety: ${d.run.safety||'none'}`]];
    const add=(label,f)=>rows.push([label,`${value(f)} ${f.unit} · ${f.quality} · ${f.frame} · ${f.source}${f.reason?' · '+f.reason:''}`]);
    add('Position',d.pose.position);add('Rotation',d.pose.rotation);add('Linear velocity',d.linear_velocity);add('Angular velocity',d.angular_velocity);add('Local +Y tilt',d.tilt);add('Floor gap',d.floor_gap);
    rows.push(['Floor geometry',d.floor_relation]);add('First-contact time',d.first_contact_time);add('Supporting foot load',d.foot_load);add('Slip / drift',d.drift);
    add('External force',d.external_force);add('External torque',d.external_torque);add('Assist support',d.assist.support);add('Assist torque',d.assist.torque);rows.push(['Command timing',d.assist.timing]);
    for(const j of d.joints.filter(j=>!this.selectedJoint||j.id===this.selectedJoint)){
      rows.push(['Joint',`${j.id} · ${j.type} · ${j.parent} → ${j.child}`]);
      const sampled=this.settings.anchorGap?this.jointSample.joints.find(s=>s.id===j.id):null;
      rows.push(['Anchor gap',`${formatGap(j.anchor_gap.value)}${sampled?' / '+sampled.level.label:''} · ${j.anchor_gap.quality} · step ${j.anchor_gap.step} · ${j.anchor_gap.source}${j.anchor_gap.reason?' · '+j.anchor_gap.reason:''}`]);
      add('Hinge angle',j.angle);add('Target',j.target);add('Target error',j.error);add('Limits',j.limits);add('Relative angular velocity',j.relative_angular_velocity);
      rows.push(['Motor',j.motor.enabled?'Commanded on':'Off']);add('Per-axis cap',j.motor.cap);add('Stiffness',j.motor.stiffness);add('Damping',j.motor.damping);add('Solver motor torque',j.motor.solver_torque);
    }
    const signature=JSON.stringify(rows.map(([label])=>label));
    if(target.dataset.rows!==signature){target.replaceChildren();target.dataset.rows=signature;for(const [label] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;target.append(dt,dd);}}
    const cells=target.querySelectorAll('dd');
    for(const [index,[label,text]] of rows.entries()){
      const dd=cells[index];
      const split=text.indexOf(' · ');
      if(split>=0){let details=dd.querySelector('details');if(!details){details=document.createElement('details');const summary=document.createElement('summary'),source=document.createElement('p');summary.title='Expand data source, frame and measurement limitations';details.append(summary,source);dd.replaceChildren(details);}details.querySelector('summary').textContent=text.slice(0,split);details.querySelector('p').textContent=text.slice(split+3);}else dd.textContent=text;
    }
  }
  snapshot(){return {settings:{...this.settings},selected:this.selected,selectedJoint:this.selectedJoint,resources:this.objects.size,readout:this.data?structuredClone(this.data):null,anchorGap:this.settings.anchorGap?{step:this.jointSample.step,time_s:this.jointSample.time_s,joints:structuredClone(this.jointSample.joints)}:null};}
  dispose(){if(this.disposed)return;this.disposed=true;this.panel.removeEventListener('change',this.onChange);for(const id of [...this.objects.keys()])this.remove(id);this.localOutlines=null;this.sim=null;this.data=null;this.jointSample=null;}
}
