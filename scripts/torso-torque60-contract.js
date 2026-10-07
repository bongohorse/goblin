// CLI research only; no runtime/FullRig controller imports.
import {createHash} from 'node:crypto';
import {vec,scale,norm,cross,rotate,sub,freeze} from '../src/labs/standing/math.js';
import {canonical} from '../src/labs/standing/config.js';
export const CONFIG=freeze({schema_version:1,study:'internal-torso-torque60-v1',joint:'shoulderL',torso:{id:'torso',mass:2,half:.15,radius:.24,anchor:vec(.4,.15,0)},partner:{id:'upperArmL',mass:.35,half:.12,radius:.09,anchor:vec(0,.18,0)},local_up:vec(0,1,0),world_up:vec(0,1,0),kp_Nm_rad:1.34,kd_Nm_s_rad:1.34,cap_Nm:.15,max_tilt_rad:.2,dt_s:1/60,solver_iterations:32,internal_pgs_iterations:1,horizon_steps:360,repeats:5,tolerances:{velocity:1e-5,inverse_tensor_relative:1e-5,discrete_momentum:1e-7,anchor:1e-6,cap:1e-12,accumulator:1e-7,tracking_rad:.01,tracking_speed:.02,off_rad:1e-5,q_sign_rad:1e-6}});
export const hash=v=>createHash('sha256').update(canonical(v)).digest('hex');
export const identity=c=>({config_id:'config:sha256:'+hash(c),experiment_id:'internal-torso-torque60-v1:'+hash(c)});
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export function upright(q){
  const n=Math.hypot(q.x,q.y,q.z,q.w);if(!Number.isFinite(n)||n<1e-12)throw Error('invalid_quaternion');
  const u=rotate(CONFIG.local_up,{x:q.x/n,y:q.y/n,z:q.z/n,w:q.w/n}),c=cross(u,CONFIG.world_up),s=norm(c),theta=Math.atan2(s,dot(u,CONFIG.world_up));
  if(theta>CONFIG.max_tilt_rad)throw Error('outside_small_tilt_domain');
  return {up:u,theta,error:s<1e-12?vec():scale(c,theta/s)};
}
export function torque(q,omega,mode='on'){
  if(!omega||Object.keys(omega).sort().join()!=='x,y,z'||!Object.values(omega).every(Number.isFinite))throw Error('invalid_angular_velocity');
  if(!['on','off','wrong-sign','missing-reaction'].includes(mode))throw Error('invalid_mode');
  const {up,theta,error}=upright(q),transverse=sub(omega,scale(up,dot(omega,up)));
  const raw=mode==='off'?vec():sub(scale(error,CONFIG.kp_Nm_rad*(mode==='wrong-sign'?-1:1)),scale(transverse,CONFIG.kd_Nm_s_rad));
  const requested=scale(raw,Math.min(1,CONFIG.cap_Nm/(norm(raw)||1)));
  return {theta_rad:theta,error_world_rad:error,transverse_world_rad_s:transverse,raw_world_Nm:raw,torso_world_Nm:requested,partner_world_Nm:mode==='missing-reaction'?vec():scale(requested,-1),cap_active:norm(raw)>CONFIG.cap_Nm};
}
