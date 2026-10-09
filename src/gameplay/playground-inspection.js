import {rotateVector,worldAnchor} from '../goblin-rig.js';
import {jointObservation,multiply,conjugate,rotationDistance,sub,rotate} from '../labs/standing/math.js';

export const BODY_LABELS={pelvis:'Pelvis',torso:'Torso',head:'Head',upperArmL:'Left upper arm',lowerArmL:'Left forearm',handL:'Left hand',upperArmR:'Right upper arm',lowerArmR:'Right forearm',handR:'Right hand',upperLegL:'Left thigh',lowerLegL:'Left shin',footL:'Left foot',upperLegR:'Right thigh',lowerLegR:'Right shin',footR:'Right foot'};
export const CONTACT_RANGE_M=.1;

// Small, JSON-safe, versioned readout. No stepping, synchronization, setters or recorder.
// Native getters / derived geometry / controller commands are explicitly different qualities.
export function readInspection(sim,bodyId){
  const entry=sim.rig.byId.get(bodyId);if(!entry)return null;
  const finite=value=>typeof value==='number'?Number.isFinite(value):value&&typeof value==='object'?Object.values(value).every(finite):true;
  const step=sim.steps,field=(value,unit,source,quality='native',reason=null)=>{
    if(!finite(value)){value=null;reason='Non-finite source data';}
    return {value:value===null?null:structuredClone(value),unit,source,quality:value===null?'unavailable':quality,frame:'world',step,reason:value===null?reason:null};
  };
  const {body,collider,spec}=entry,up=rotateVector({x:0,y:1,z:0},body.rotation());
  const contact=collider.contactCollider(sim.floor,CONTACT_RANGE_M);
  const joints=sim.entries.filter(e=>spec.id===e.spec.parent||spec.id===e.spec.child).map(e=>{
    const a=e.joint.body1(),b=e.joint.body2(),base=multiply(a.rotation(),e.bindFrame),child=multiply(b.rotation(),e.joint.frameX2());
    const observation=jointObservation(e),actual=e.spec.type==='revolute'?observation.angle:multiply(conjugate(base),child);
    const error=e.spec.type==='revolute'?Math.abs(e.target-actual):rotationDistance(e.target,actual);
    return {id:e.spec.id,type:e.spec.type,parent:e.spec.parent,child:e.spec.child,
      anchors:{a:worldAnchor(a,e.joint.anchor1()),b:worldAnchor(b,e.joint.anchor2())},
      anchor_gap:field(observation.anchor_error,'m','native joint anchors + body transforms','derived'),
      angle:field(e.spec.type==='revolute'?actual:null,'rad','joint frames, signed hinge X angle','derived','Only defined for revolute joints'),
      target:field(e.target,e.spec.type==='revolute'?'rad':'quaternion','sim.entries.target (controller target)','command'),
      error:field(error,'rad','angle difference / quaternion rotation distance to controller target','derived'),
      limits:field(e.spec.limits,'rad','rig joint configuration','configuration','No angular limits configured for spherical joints'),
      relative_angular_velocity:field(rotate(sub(b.angvel(),a.angvel()),conjugate(base)),'rad/s','native angvel difference in parent bind-joint frame','derived'),
      motor:{enabled:sim.motorEnabled,cap:field(sim.commands.motorCap,'Nm','sim.commands.motorCap (per motor axis cap)','command'),
        stiffness:field(sim.motorEnabled?sim.config.stiffness:0,'Nm/rad','controller gain configuration','configuration'),
        damping:field(sim.motorEnabled?sim.config.damping:0,'Nm s/rad','controller gain configuration','configuration'),
        solver_torque:field(null,'Nm','not exposed/validated by this adapter','unavailable','Configured cap is not measured solver torque')}};
  });
  for(const j of joints){j.target.frame='joint';j.angle.frame='joint';j.error.frame='joint';j.limits.frame='joint';j.relative_angular_velocity.frame='parent bind-joint';for(const f of Object.values(j.motor))if(f&&typeof f==='object')f.frame='joint';}
  return {inspection_schema_version:1,body_id:spec.id,step,time_s:step/60,
    run:{state:sim.state,reason:sim.reason,safety:sim.invalid,assist_enabled:sim.enabled},
    pose:{position:field(body.translation(),'m','RigidBody.translation'),rotation:field(body.rotation(),'quaternion','RigidBody.rotation')},
    linear_velocity:field(body.linvel(),'m/s','RigidBody.linvel (centre of mass)'),
    angular_velocity:field(body.angvel(),'rad/s','RigidBody.angvel'),
    tilt:field(Math.acos(Math.max(-1,Math.min(1,up.y))),'rad','body local +Y vs world +Y','derived'),
    floor_gap:field(contact?.distance??null,'m','Collider.contactCollider(floor, 0.1 m prediction)','geometry',`No witness within ${CONTACT_RANGE_M} m`),
    floor_relation:contact?(contact.distance>0?'separated':'touching / penetrating'):'outside query range',
    first_contact_time:field(null,'s','not recorded','unavailable','Current geometric query is not a first-contact event history'),
    foot_load:field(null,'N','not measured','unavailable','Contact/proximity does not establish supporting load'),
    drift:field(null,'m','no drift measurement/reference','unavailable','Position change alone is not a validated slip/drift diagnosis'),
    external_force:field(body.userForce(),'N','RigidBody.userForce (applied external force only)','command'),
    external_torque:field(body.userTorque(),'Nm','RigidBody.userTorque (applied external torque only)','command'),
    assist:{support:field(spec.id==='pelvis'?sim.commands.support:0,'N','sim.commands.support on pelvis','command'),
      torque:field(sim.commands.torques[spec.id]??{x:0,y:0,z:0},'Nm','sim.commands.torques (world-up assistance)','command'),
      timing:'Current command state: computed before the last native step; cleared on interruption/reset. Not solver reactions.'},joints};
}

export function jointSegments(rig){
  const values=[];
  for(const {spec,joint} of rig.joints.values()){
    const a=rig.byId.get(spec.parent).body,b=rig.byId.get(spec.child).body;
    const pa=a.translation(),pb=b.translation(),aa=worldAnchor(a,joint.anchor1()),ab=worldAnchor(b,joint.anchor2());
    for(const p of [pa,aa,aa,ab,ab,pb,{x:aa.x-.025,y:aa.y,z:aa.z},{x:aa.x+.025,y:aa.y,z:aa.z},{x:ab.x,y:ab.y-.025,z:ab.z},{x:ab.x,y:ab.y+.025,z:ab.z}])values.push(p.x,p.y,p.z);
  }
  return values;
}
