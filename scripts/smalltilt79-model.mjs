// Issue79: pure frozen construction and stored-state checks. No Rapier worlds.
import assert from 'node:assert/strict';
import {CONFIG,torque} from './torso-torque60-contract.js';
import {axis,tiltOracle} from './torso-torque60-oracle.js';
import {encodeTorque,exactWithinCap,matrixH} from './review-actuation74.mjs';
import {av,aq,normalize,rotate,ov,add,sub,mul,cross,dot,length,invariants,difference} from './finite-step66-reference.js';
import {reference,publicControls} from './actuation75-model.mjs';

export const ROOT='docs/research/standing-lab/smalltilt79/';
export const tilts=['pitch+','pitch-','roll+','roll-','combined'];
export function matrix(){
  const cases=[];
  const push=(kind,tilt,mode,steps)=>{for(let repeat=1;repeat<=5;repeat++)cases.push({id:`${kind}/${tilt}/${mode}/${repeat}`,kind,tilt,mode,repeat,max_steps:steps});};
  for(const motion of ['co-rotation','partner-only','axial-yaw'])push('motion',motion,'on',1);
  push('negative','pitch+','wrong-sign',360);
  push('negative','pitch+','missing-reaction',1);
  for(const tilt of tilts)for(const mode of ['on','off'])push('core',tilt,mode,360);
  return cases;
}
export const config={schema_version:1,study:'smalltilt79-v1',base_main:'dc44ff06d8cdb56829506c8ce1faceeb32462c82',
  template:'docs/research/standing-lab/review77/upright-proposal.md',rapier:'0.21.0',upstream:'b716d375efc0201003f0cd9ef7168eee0b62c177',
  fixture:{joint:'shoulderL',torso:CONFIG.torso,partner:CONFIG.partner,gravity:[0,0,0],contacts:false,body_damping:0,sleep:false,motors:false},
  kp_Nm_rad:1.34,kd_Nm_s_rad:1.34,cap_Nm:.15,domain_rad:.2,dt_s:1/60,solver_iterations:32,internal_pgs_iterations:1,extra_solver_iterations:0,max_ccd_substeps:1,
  common_yaw_rad:.7,repeats:5,max_worlds:75,tracking_tilt_strict_rad:.01,tracking_transverse_speed_strict_rad_s:.02,off_delta_rad:1e-5,
  anchor_initial_m:1e-6,ideal_anchor_velocity_m_s:1e-10,public_inertia_relative:1e-5,q_sign_rad:1e-6,reaction_guard:2e-10,
  numerical_reference_checks:{resolutions:[8,16,32,64,128],velocity_rad_s:1e-10,angle_rad:1e-10,position_m:1e-11,H_kg_m2_s:1e-10,energy_J:1e-10},
  encoding_id:'bounded-toward-zero-f32-v1',engine_precision:'indeterminate_not_certified',cases:matrix()};

function initialImpl(c){
  const yaw=axis(0,1,0,.7),q=c.kind==='motion'?yaw:yaw.multiply(c.tilt==='combined'?axis(1,0,0,.06).multiply(axis(0,0,1,-.06)):axis(c.tilt.startsWith('pitch')?1:0,0,c.tilt.startsWith('roll')?1:0,c.tilt.endsWith('+')?.08:-.08));
  const wT=c.kind==='motion'?(c.tilt==='co-rotation'?[.1,0,0]:c.tilt==='axial-yaw'?[0,.1,0]:[0,0,0]):[0,0,0];
  const wP=c.kind==='motion'&&c.tilt!=='axial-yaw'?[.1,0,0]:[0,0,0];
  const r=[CONFIG.torso.anchor,CONFIG.partner.anchor].map(a=>rotate(normalize(aq(q)),av(a))),d=sub(cross(wP,r[1]),cross(wT,r[0]));
  const v=[mul(d,.35/2.35),mul(d,-2/2.35)];
  const gap=length(sub(add(v[0],cross(wT,r[0])),add(v[1],cross(wP,r[1]))));
  assert.ok(gap<=1e-10,'invalid_ideal_velocity');
  return {rotation:{x:q.x,y:q.y,z:q.z,w:q.w},angular:[ov(wT),ov(wP)],linear:v.map(ov),ideal_anchor_velocity_gap:gap};
}
function commandImpl(c,pre){
  const mode=c.mode,result=torque(pre[0].rotation,pre[0].angular_velocity,mode);
  let requested=av(result.torso_world_Nm);
  if(length(requested)>.15||!exactWithinCap(requested,.15))requested=mul(requested,.15*(1-Number.EPSILON)/length(requested));
  assert.ok(exactWithinCap(requested,.15));
  const encoded=encodeTorque(requested),partner=mode==='missing-reaction'?[0,0,0]:encoded.map(x=>x===0?0:-x);
  const up=rotate(normalize(aq(pre[0].rotation)),[0,1,0]);
  return {law:result,requested_world_Nm:requested,encoded_pair:[encoded,partner],representation_delta:sub(encoded,requested),encoded_norm_Nm:length(encoded),encoded_axial_Nm:dot(encoded,up),partner_sum:add(encoded,partner),api:'addTorque',units:'Nm',encoding_id:config.encoding_id};
}
function stateMetricsImpl(state){
  for(const b of state){assert.ok(b.mass>0&&av(b.inertia).every(x=>x>0),'invalid_mass');}
  const t=state[0],p=state[1],u=rotate(normalize(aq(t.rotation)),[0,1,0]),omega=av(t.angular_velocity),transverse=sub(omega,mul(u,dot(omega,u))),i=invariants(state),m=matrixH(state);
  assert.ok(length(sub(i.H,m.H))<1e-14&&length(sub(i.P,m.P))<1e-14,'invalid_H_reference');
  return {tilt_rad:tiltOracle(t.rotation),torso_transverse_rad_s:length(transverse),relative_omega_rad_s:sub(omega,av(p.angular_velocity)),invariants:i,
    pair_COM_m:mul(add(mul(av(t.world_com),t.mass),mul(av(p.world_com),p.mass)),1/(t.mass+p.mass)),partner_speed_rad_s:length(av(p.angular_velocity)),matrix_H:m.H};
}
function oneStepReferenceImpl(pre,pair,T){return reference(pre,pair,T,true,config);}
function stepMetricsImpl(pre,post,c,T){
  const a=stateMetrics(pre),b=stateMetrics(post),integral=mul(add(...c.encoded_pair),T),deltaH=sub(b.invariants.H,a.invariants.H);
  return {pre:a,post:b,physical_delta_H:deltaH,actual_torque_integral:integral,actual_integral_residual:sub(deltaH,integral),
    physical_delta_E_J:b.invariants.E-a.invariants.E,total_pair_power_PRE_W:dot(c.encoded_pair[0],av(pre[0].angular_velocity))+dot(c.encoded_pair[1],av(pre[1].angular_velocity)),
    intended_paired_power_PRE_W:dot(c.encoded_pair[0],a.relative_omega_rad_s)};
}
export function auditStep(c,x){
  const expected={counts:{bodies:2,colliders:2,joints:1,multibody_joints:0},gravity:{x:0,y:0,z:0},joint_type:6,joint_contacts:false,contacts:0,integration:{dt:Math.fround(1/60),numSolverIterations:32,numInternalPgsIterations:1,maxCcdSubsteps:1},bodies:[0,1].map(()=>({dynamic:true,sleeping:false,linear_damping:0,angular_damping:0,additional_solver_iterations:0,gravity_scale:1,ccd:false}))};
  assert.deepEqual(x.runtime_before,expected,'invalid_runtime_before');assert.deepEqual(x.runtime_after,expected,'invalid_runtime_after');
  assert.deepEqual(x.commands,command(c,x.pre),'fail_command_construction');
  const zero={x:0,y:0,z:0},z=[zero,zero];
  for(const name of ['after_reset','cleared','forces_before','forces_after'])assert.deepEqual(x[name],z,'fail_command_'+name);
  assert.deepEqual(x.accumulators,x.commands.encoded_pair.map(ov),'fail_command_readback');
  const phase=[...[0,1].map(body=>({op:'resetTorques',body,step:x.step-1,wake:true})),
    ...[0,1].map(body=>({op:'addTorque',body,step:x.step-1,wake:true,vector:ov(x.commands.encoded_pair[body])})),{op:'world.step',step:x.step-1},
    ...[0,1].map(body=>({op:'resetTorques',body,step:x.step,wake:true}))];
  assert.deepEqual(x.phase,phase,'fail_command_phase');
  for(const v of x.commands.encoded_pair)assert.ok(exactWithinCap(v,.15),'fail_command_cap');
  assert.deepEqual(x.metrics,stepMetrics(x.pre,x.post,x.commands,x.T),'invalid_metrics');
  return true;
}
export function checkSetup(c,x){
  const s=x.setup;assert.equal(x.T,Math.fround(1/60));assert.deepEqual(s.counts,{bodies:2,colliders:2,joints:1,multibody_joints:0});
  assert.deepEqual(s.gravity,{x:0,y:0,z:0});assert.equal(s.joint_type,6);assert.equal(s.joint_contacts,false);
  assert.deepEqual(s.collider_groups,[0,0]);assert.deepEqual(s.collider_masses,x.pre.map(b=>b.mass));
  const ip=s.integration;assert.equal(ip.dt,x.T);assert.equal(ip.numSolverIterations,32);assert.equal(ip.numInternalPgsIterations,1);assert.equal(ip.maxCcdSubsteps,1);
  for(const b of s.bodies)assert.deepEqual(b,{dynamic:true,sleeping:false,linear_damping:0,angular_damping:0,additional_solver_iterations:0,gravity_scale:1,ccd:false});
  assert.equal(s.bodies.length,2);assert.equal(s.contacts,0);assert.equal(s.motors,0);
  assert.equal(publicControls(x.pre,s.inverse_tensors,false).pass,true,'invalid_public_inertia');
  assert.ok(stateMetrics(x.pre).invariants.anchor_gap_m<=1e-6,'invalid_initial_anchor');
  for(const [j,b]of x.pre.entries()){const spec=j?CONFIG.partner:CONFIG.torso;assert.equal(b.id,spec.id);assert.ok(Math.abs(b.mass-spec.mass)<1e-6);assert.deepEqual(b.anchor,spec.anchor);}
  assert.deepEqual(x.initial,initial(c));
  for(const [j,b]of x.pre.entries()){
    const q=normalize(aq(b.rotation)),ideal=normalize(aq(x.initial.rotation));
    assert.ok(Math.min(length(sub(q,ideal)),length(add(q,ideal)))<1e-6,'invalid_initial_rotation');
    assert.ok(length(sub(av(b.world_com),mul(rotate(ideal,av(b.anchor)),-1)))<1e-6,'invalid_initial_position');
    assert.ok(length(sub(av(b.angular_velocity),av(x.initial.angular[j])))<1e-7,'invalid_initial_angular');
    assert.ok(length(sub(av(b.linear_velocity),av(x.initial.linear[j])))<1e-7,'invalid_initial_linear');
  }
}
export function terminal(c,run){
  const last=run.steps.at(-1);if(!last)return {status:'invalid_setup',pass:false};
  const m=last.metrics.post;
  if(c.mode==='wrong-sign')return {status:m.tilt_rad>.2?'expected_negative_domain':'completed_negative',pass:m.tilt_rad>run.initial_metrics.tilt_rad&&JSON.stringify(last.commands.encoded_pair)!==JSON.stringify(command({...c,mode:'on'},last.pre).encoded_pair)};
  if(m.tilt_rad>.2)return {status:'invalid_domain',pass:false};
  if(c.kind==='motion'||c.mode==='missing-reaction')return {status:'completed_one_step',pass:true};
  const pass=run.steps.length===360&&(c.mode==='on'?m.tilt_rad<.01&&m.torso_transverse_rad_s<.02:Math.abs(m.tilt_rad-run.initial_metrics.tilt_rad)<=1e-5);
  return {status:pass?'completed_behavior':'fail_behavior',pass};
}
export function reaction(runs){
  const neg=runs.filter(x=>x.case.mode==='missing-reaction'),pos=runs.filter(x=>x.case.kind==='core'&&x.case.tilt==='pitch+'&&x.case.mode==='on');
  if(neg.length!==5||pos.length!==5)return {status:'pending_matched_core',pass:null};
  for(let j=0;j<5;j++){assert.deepEqual(neg[j].pre,pos[j].pre);assert.deepEqual(neg[j].steps[0].commands.encoded_pair[0],pos[j].steps[0].commands.encoded_pair[0]);}
  const positive_max=Math.max(...pos.map(r=>length(r.steps[0].metrics.physical_delta_H))),negative_min=Math.min(...neg.map(r=>length(r.steps[0].metrics.physical_delta_H))),actual_max=Math.max(...neg.map(r=>length(r.steps[0].metrics.actual_integral_residual)));
  return {status:'matched',positive_max,negative_min,actual_max,margins:[negative_min-positive_max-2e-10,negative_min-actual_max-2e-10],pass:negative_min>positive_max+2e-10&&actual_max+2e-10<negative_min};
}

// Canonical zeros survive JSON storage; this does not alter physical values.
export function clean(x){if(typeof x==='number'){assert.ok(Number.isFinite(x),'nonfinite observation');return x===0?0:x;}if(Array.isArray(x))return x.map(clean);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,clean(v)]));return x;}
export const initial=(...args)=>clean(initialImpl(...args));
export const command=(...args)=>clean(commandImpl(...args));
export const stateMetrics=(...args)=>clean(stateMetricsImpl(...args));
export const oneStepReference=(...args)=>clean(oneStepReferenceImpl(...args));
export const stepMetrics=(...args)=>clean(stepMetricsImpl(...args));
