import R from '@dimforge/rapier3d-compat';
import {CONFIG} from './torso-torque60-contract.js';
import {vec,scale,norm,sub} from '../src/labs/standing/math.js';
import {V,Q,record,axis,tensor,capsule,constrained,momentum,rotationBound} from './torso-torque60-oracle.js';
const zero=vec(),unit={x:0,y:0,z:0,w:1};
export function snapshot(b,s){return {id:s.id,mass:b.mass(),anchor:{...s.anchor},inertia:{...b.principalInertia()},principal_frame:{...b.principalInertiaLocalFrame()},rotation:{...b.rotation()},world_com:{...b.worldCom()},linear_velocity:{...b.linvel()},angular_velocity:{...b.angvel()}};}
export function fixture({connected=true,synthetic=false,rotation=unit,partnerRotation=rotation}={}){
  const world=new R.World(zero);world.timestep=CONFIG.dt_s;world.integrationParameters.numSolverIterations=CONFIG.solver_iterations;world.integrationParameters.numInternalPgsIterations=CONFIG.internal_pgs_iterations;
  const specs=[CONFIG.torso,CONFIG.partner],bodies=[];
  try{
    for(const [j,s] of specs.entries()){
      const q=j?partnerRotation:rotation,anchor=V(s.anchor).applyQuaternion(Q(q)),desc=R.RigidBodyDesc.dynamic().setRotation(q).setTranslation(-anchor.x,-anchor.y,-anchor.z).setLinearDamping(0).setAngularDamping(0).setCanSleep(false);
      if(synthetic)desc.setAdditionalMassProperties(s.mass,zero,j?vec(.011,.017,.023):vec(.031,.049,.071),j?axis(1,0,0,-.5).multiply(axis(0,0,1,.3)):axis(0,0,1,.4).multiply(axis(0,1,0,-.3)));
      const b=world.createRigidBody(desc);if(!synthetic)world.createCollider(R.ColliderDesc.capsule(s.half,s.radius).setMass(s.mass).setCollisionGroups(0),b);b.recomputeMassPropertiesFromColliders();bodies.push(b);
    }
    const joint=connected?world.createImpulseJoint(R.JointData.spherical(specs[0].anchor,specs[1].anchor),bodies[0],bodies[1],true):null;joint?.setContactsEnabled(false);
    return {world,bodies,specs,joint,state:()=>bodies.map((b,j)=>snapshot(b,specs[j])),dispose:()=>world.free()};
  }catch(e){world.free();throw e;}
}
export function command(f,c){for(const [j,b] of f.bodies.entries()){b.resetTorques(true);b.addTorque(j?c.partner_world_Nm:c.torso_world_Nm,true);}}
export function clear(f){for(const b of f.bodies)b.resetTorques(true);}
function tensorError(f,pre,synthetic){return Math.max(...f.bodies.map((b,j)=>{
  const s=pre[j],expected=synthetic?tensor(s.rotation,j?axis(1,0,0,-.5).multiply(axis(0,0,1,.3)):axis(0,0,1,.4).multiply(axis(0,1,0,-.3)),j?vec(.011,.017,.023):vec(.031,.049,.071)):tensor(s.rotation,unit,capsule(f.specs[j]));
  const actual=b.effectiveWorldInvInertia(),inverse=expected.clone().invert(),actualElements=[actual.m11,actual.m21,actual.m31,actual.m12,actual.m22,actual.m32,actual.m13,actual.m23,actual.m33];
  return Math.max(...inverse.elements.map((x,k)=>Math.abs(x-actualElements[k])))/Math.max(...inverse.elements.map(Math.abs));
}));}
export function firstStep({connected,synthetic,method='torque',direction,missing=false}){
  const rotation=axis(0,1,0,.7).multiply(axis(0,0,1,-.08)),partnerRotation=axis(0,1,0,-.3).multiply(axis(1,0,0,.06));
  const f=fixture({connected,synthetic,rotation,partnerRotation});try{
    const pre=f.state(),dt=f.world.timestep,tau=V(direction).normalize().multiplyScalar(CONFIG.cap_Nm),t=record(tau),inverse_tensor_error=tensorError(f,pre,synthetic);
    const oracle=connected?constrained(pre[0],pre[1],t,dt):{torso_angular:record(tau.clone().multiplyScalar(dt).applyMatrix3(tensor(pre[0].rotation,pre[0].principal_frame,pre[0].inertia).invert())),partner_angular:record(tau.clone().multiplyScalar(-dt).applyMatrix3(tensor(pre[1].rotation,pre[1].principal_frame,pre[1].inertia).invert())),torso_linear:zero,partner_linear:zero,constraint_impulse_Ns:zero};
    if(method==='impulse'){f.bodies[0].applyTorqueImpulse(record(tau.clone().multiplyScalar(dt)),true);f.bodies[1].applyTorqueImpulse(record(tau.clone().multiplyScalar(-dt)),true);}
    else command(f,{torso_world_Nm:t,partner_world_Nm:missing?zero:record(tau.clone().negate())});
    const accumulators=f.bodies.map(b=>({...b.userTorque()}));
    if(method==='torque')f.world.step();const post=f.state();clear(f);
    const velocity_error=Math.max(V(post[0].angular_velocity).distanceTo(V(oracle.torso_angular)),V(post[1].angular_velocity).distanceTo(V(oracle.partner_angular)),V(post[0].linear_velocity).distanceTo(V(oracle.torso_linear)),V(post[1].linear_velocity).distanceTo(V(oracle.partner_linear)));
    const discrete_momentum_residual=momentum(post,pre).sub(momentum(pre)).length(),physical_momentum_residual=momentum(post).sub(momentum(pre)).length(),physical_resolution_bound=rotationBound(pre,post)+CONFIG.tolerances.discrete_momentum;
    const accumulator_error=method==='impulse'?Math.max(...accumulators.map(norm)):Math.max(norm(sub(accumulators[0],t)),norm(sub(accumulators[1],missing?zero:scale(t,-1))));
    const anchor_initial_error=V(pre[0].world_com).add(V(pre[0].anchor).applyQuaternion(Q(pre[0].rotation))).distanceTo(V(pre[1].world_com).add(V(pre[1].anchor).applyQuaternion(Q(pre[1].rotation))));
    const pass=missing?discrete_momentum_residual>100*CONFIG.tolerances.discrete_momentum:tau.length()<=CONFIG.cap_Nm+CONFIG.tolerances.cap&&velocity_error<=CONFIG.tolerances.velocity&&inverse_tensor_error<=CONFIG.tolerances.inverse_tensor_relative&&discrete_momentum_residual<=CONFIG.tolerances.discrete_momentum&&physical_momentum_residual<=physical_resolution_bound&&accumulator_error<=CONFIG.tolerances.accumulator&&anchor_initial_error<=CONFIG.tolerances.anchor;
    return {connected,synthetic,method,direction,missing_reaction:missing,dt,requested_world_Nm:t,cap_norm_Nm:tau.length(),pre,post,oracle,accumulators,inverse_tensor_error,velocity_error,accumulator_error,anchor_initial_error,discrete_momentum_residual,physical_momentum_residual,physical_resolution_bound,pass};
  }finally{f.dispose();}
}
export function verifyFirstSteps(){
  const cases=[];for(const direction of [vec(1),vec(-1),vec(0,1),vec(0,-1),vec(0,0,1),vec(0,0,-1),vec(.6,-.3,.7),vec(-.6,.3,-.7)]){
    for(const method of ['torque','impulse'])cases.push(firstStep({connected:false,synthetic:true,method,direction}));
    cases.push(firstStep({connected:true,synthetic:false,direction}));
  }
  cases.push(firstStep({connected:true,synthetic:false,direction:vec(1),missing:true}));return cases;
}
