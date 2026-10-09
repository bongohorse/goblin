// Issue81: independent stored-trajectory mathematics and chronological decisions.
// No Rapier/Three.js import, no fixture, and no world creation or parameter search.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validate as frozenValidate} from './smalltilt79-reader.mjs';
export const BUILDS={
 '7534e4e473b0371d4e54da553dd59b6ef4abbf6e':'7f631637ac0e1dbef14e4e0dfbde1a7cbbfde6c5f686af4ac998001ac53a2d9d',
 '5aa32acc5d4b71d4f5abc6b2d3bceee88da28669':'53153280ebca8f947a37a60b365ab4774c506a7e9b809b11227bfd86779ed183'
};
const v=o=>[o.x,o.y,o.z],add=(a,b)=>a.map((x,j)=>x+b[j]),sub=(a,b)=>a.map((x,j)=>x-b[j]),scale=(a,k)=>a.map(x=>x*k),dot=(a,b)=>a.reduce((s,x,j)=>s+x*b[j],0),norm=a=>Math.hypot(...a),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function rotation(q){const n=Math.hypot(q.x,q.y,q.z,q.w);assert.ok(Number.isFinite(n)&&n>0);const [x,y,z,w]=[q.x/n,q.y/n,q.z/n,q.w/n];return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];}
const mv=(A,x)=>A.map(r=>dot(r,x)),transpose=A=>A[0].map((_,j)=>A.map(r=>r[j]));
export function physical(bodies){let H=[0,0,0],P=[0,0,0],E=0;for(const b of bodies){const R=rotation(b.rotation),F=rotation(b.principal_frame),w=v(b.angular_velocity),local=mv(transpose(F),mv(transpose(R),w)),spin=mv(R,mv(F,local.map((x,j)=>x*v(b.inertia)[j]))),p=scale(v(b.linear_velocity),b.mass);H=add(H,add(spin,cross(v(b.world_com),p)));P=add(P,p);E+=(dot(w,spin)+b.mass*dot(v(b.linear_velocity),v(b.linear_velocity)))/2;}return {H,P,E};}
export function torso(b){const R=rotation(b.rotation),up=R.map(r=>r[1]),omega=v(b.angular_velocity),axis=cross(up,[0,1,0]),s=norm(axis),tilt=Math.atan2(s,up[1]);return {up,tilt,transverse:sub(omega,scale(up,dot(omega,up))),error:s<1e-12?[0,0,0]:scale(axis,tilt/s)};}
function dyadic(x){assert.ok(Number.isFinite(x));const d=new DataView(new ArrayBuffer(8));d.setFloat64(0,Math.abs(x));const u=d.getBigUint64(0),e=Number(u>>52n&2047n),f=u&((1n<<52n)-1n);return e?((1n<<52n)|f)<<BigInt(e-1):f;}
const within=x=>x.map(dyadic).reduce((s,n)=>s+n*n,0n)<=dyadic(.15)**2n;
function encode(x){return x.map(a=>{if(a===0)return 0;const f=new Float32Array([Math.abs(a)]),bits=new Uint32Array(f.buffer);if(f[0]>Math.abs(a))bits[0]--;return Math.sign(a)*f[0];});}
export function independentCommand(c,pre){const a=torso(pre[0]);assert.ok(a.tilt<=.2,'independent PRE outside domain');let raw=c.mode==='off'?[0,0,0]:sub(scale(a.error,1.34*(c.mode==='wrong-sign'?-1:1)),scale(a.transverse,1.34));let requested=scale(raw,Math.min(1,.15/(norm(raw)||1)));if(norm(requested)>.15||!within(requested))requested=scale(requested,.15*(1-Number.EPSILON)/norm(requested));const encoded=encode(requested);return {raw,requested,encoded,partner:c.mode==='missing-reaction'?[0,0,0]:encoded.map(x=>x===0?0:-x)};}
function cases(){const a=[],push=(kind,tilt,mode,max_steps)=>{for(let repeat=1;repeat<=5;repeat++)a.push({id:`${kind}/${tilt}/${mode}/${repeat}`,kind,tilt,mode,repeat,max_steps});};for(const m of ['co-rotation','partner-only','axial-yaw'])push('motion',m,'on',1);push('negative','pitch+','wrong-sign',360);push('negative','pitch+','missing-reaction',1);for(const t of ['pitch+','pitch-','roll+','roll-','combined'])for(const m of ['on','off'])push('core',t,m,360);return a;}
export function matchedReaction(runs){const n=runs.filter(x=>x.case.mode==='missing-reaction'),p=runs.filter(x=>x.case.kind==='core'&&x.case.tilt==='pitch+'&&x.case.mode==='on');if(n.length!==5||p.length!==5)return null;for(let j=0;j<5;j++){assert.deepEqual(n[j].pre,p[j].pre);assert.deepEqual(n[j].steps[0].commands.encoded_pair[0],p[j].steps[0].commands.encoded_pair[0]);}const delta=x=>sub(physical(x.steps[0].post).H,physical(x.pre).H),positive_max=Math.max(...p.map(x=>norm(delta(x)))),negative_min=Math.min(...n.map(x=>norm(delta(x)))),actual_max=Math.max(...n.map(x=>norm(sub(delta(x),scale(add(...x.steps[0].commands.encoded_pair),x.T)))));return {positive_max,negative_min,actual_max,pass:negative_min>positive_max+2e-10&&actual_max+2e-10<negative_min};}
export function independentAudit(r){
 assert.equal(r.fresh_worlds,r.runs.length+(r.failed_world?1:0));assert.ok(r.fresh_worlds<=75);const matrix=cases(),terminals=[];let max_command_reference_difference=0,max_H_reference_difference=0,max_axial_Nm=0,max_partner_speed=0,positive_pair_power_steps=0,energy_increase_steps=0,steps=0,negativeFailureAt=null;
 for(const [i,x]of r.runs.entries()){
  assert.deepEqual(x.case,matrix[i]);assert.ok(x.steps.length>0&&x.steps.length<=x.case.max_steps);assert.equal(x.T,Math.fround(1/60));
  const initial=torso(x.pre[0]);
  for(const [j,s]of x.steps.entries()){
   assert.equal(s.step,j+1);assert.deepEqual(s.pre,j?x.steps[j-1].post:x.pre);const c=independentCommand(x.case,s.pre),pre=physical(s.pre),post=physical(s.post),p=torso(s.post[0]);
   for(const [a,b]of [[c.raw,v(s.commands.law.raw_world_Nm)],[c.requested,s.commands.requested_world_Nm],[c.encoded,s.commands.encoded_pair[0]],[c.partner,s.commands.encoded_pair[1]]]){const e=norm(sub(a,b));max_command_reference_difference=Math.max(max_command_reference_difference,e);assert.ok(e<1e-12,'independent command mathematics differs');}
   assert.ok(within(s.commands.encoded_pair[0])&&within(s.commands.encoded_pair[1]));assert.deepEqual(s.accumulators,s.commands.encoded_pair.map(a=>({x:a[0],y:a[1],z:a[2]})));
   for(const [a,b]of [[pre.H,s.metrics.pre.invariants.H],[post.H,s.metrics.post.invariants.H]]){const e=norm(sub(a,b));max_H_reference_difference=Math.max(max_H_reference_difference,e);assert.ok(e<1e-12,'independent spin+orbital H differs');}
   assert.ok(Math.abs(p.tilt-s.metrics.post.tilt_rad)<1e-6,'independent tilt marker');assert.ok(Math.abs(norm(p.transverse)-s.metrics.post.torso_transverse_rad_s)<1e-12);
   max_axial_Nm=Math.max(max_axial_Nm,Math.abs(dot(s.commands.encoded_pair[0],torso(s.pre[0]).up)));max_partner_speed=Math.max(max_partner_speed,norm(v(s.post[1].angular_velocity)));positive_pair_power_steps+=dot(s.commands.encoded_pair[0],v(s.pre[0].angular_velocity))+dot(s.commands.encoded_pair[1],v(s.pre[1].angular_velocity))>0?1:0;energy_increase_steps+=post.E>pre.E?1:0;
   if(p.tilt>.2)assert.equal(j,x.steps.length-1,'continued within world after first domain exit');steps++;
  }
  const last=x.steps.at(-1),end=torso(last.post[0]);assert.ok(x.steps.length===x.case.max_steps||end.tilt>.2,'truncated world');
  let pass;if(x.case.mode==='wrong-sign')pass=end.tilt>initial.tilt&&norm(sub(independentCommand({...x.case,mode:'on'},last.pre).encoded,last.commands.encoded_pair[0]))>0;else if(end.tilt>.2)pass=false;else if(x.case.kind==='core')pass=x.steps.length===360&&(x.case.mode==='on'?end.tilt<.01&&norm(end.transverse)<.02:Math.abs(end.tilt-initial.tilt)<=1e-5);else pass=true;
  assert.equal(x.termination.pass,pass);if(!pass)assert.equal(i,r.runs.length-1,'continued after behavior blocker');
  const reaction=matchedReaction(r.runs.slice(0,i+1));if(reaction&&!reaction.pass){negativeFailureAt=i+1;assert.equal(i,r.runs.length-1,'continued after matched negative-control blocker');assert.equal(r.failed_world,null,'allocated another world after negative-control blocker');}
  terminals.push({id:x.case.id,steps:x.steps.length,initial_tilt:initial.tilt,final_tilt:end.tilt,transverse_speed:norm(end.transverse),partner_speed:norm(v(last.post[1].angular_velocity)),pass});
 }
 const reaction=matchedReaction(r.runs);return {worlds:r.fresh_worlds,steps,terminals,reaction,negativeFailureAt,max_command_reference_difference,max_H_reference_difference,descriptive:{max_axial_Nm,max_partner_speed,positive_pair_power_steps,energy_increase_steps},scope:'isolated two-body SmallTilt only; not Standing/get-up/FullRig or certified engine precision'};
}
export function validateReviewed(r,head){assert.ok(Object.hasOwn(BUILDS,head),'no registered historical execution identity');assert.equal(r.provenance.build_id,head+':'+BUILDS[head],'wrong historical build identity');const independent=independentAudit(r),frozen=frozenValidate(r,head);return {frozen,independent};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv[2])console.log(JSON.stringify(validateReviewed(JSON.parse(fs.readFileSync(process.argv[2])),process.argv[3])));
 else {const {auditArchive}=await import('./smalltilt79-archive.mjs');console.log(JSON.stringify(auditArchive()));}
}
