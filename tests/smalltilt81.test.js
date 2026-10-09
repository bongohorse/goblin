import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {readArchive} from '../scripts/smalltilt79-archive.mjs';import {readReproduction} from '../scripts/smalltilt81-reproduction.mjs';
import {independentAudit,validateReviewed} from '../scripts/review-smalltilt81.mjs';import {stepMetrics,reaction} from '../scripts/smalltilt79-model.mjs';
const {raw,head}=readArchive();
test('81 independent terminal/command/physical-H audit supports every original and fresh repeat',()=>{
 const a=independentAudit(raw),b=readReproduction();assert.equal(a.worlds,75);assert.equal(a.steps,18330);assert.ok(a.terminals.every(t=>t.pass));assert.equal(a.reaction.pass,true);assert.deepEqual(b.raw.runs,raw.runs);assert.equal(validateReviewed(b.raw,b.head).frozen.decision,'local_smalltilt_supported');
});
function failedReaction(){const r={...raw,runs:[...raw.runs]};for(let i=20;i<25;i++){const x=structuredClone(raw.runs[i]);x.steps[0].post=structuredClone(x.pre);x.steps[0].metrics=stepMetrics(x.steps[0].pre,x.steps[0].post,x.steps[0].commands,x.T);r.runs[i]=x;}r.reaction=reaction(r.runs);r.decision='negative_control_blocker_no_rerun';return r;}
test('81 rejects later worlds after a coherent matched-reaction blocker; accepts the exact stopped prefix',()=>{
 const r=failedReaction();assert.equal(r.reaction.pass,false);assert.throws(()=>validateReviewed(r,head),/continued after matched negative-control blocker/);r.runs=r.runs.slice(0,30);r.fresh_worlds=30;assert.equal(validateReviewed(r,head).frozen.decision,'negative_control_blocker_no_rerun');
});
test('81 rejects false registered source identity and lossless-replay metadata corruption',()=>{
 const r={...raw,provenance:{...raw.provenance,build_id:head+':'+ '0'.repeat(64)}};assert.throws(()=>validateReviewed(r,head),/wrong historical build identity/);
 const m=JSON.parse(fs.readFileSync('docs/research/standing-lab/review81/reproduction.json'));for(const mutate of [x=>x.reviewed_head='0'.repeat(40),x=>x.runs_sha256='0'.repeat(64),x=>x.raw_sha256='0'.repeat(64),x=>x.raw_bytes++,x=>x.fresh_worlds=74,x=>x.controller_approved=true]){const bad=structuredClone(m);mutate(bad);assert.throws(()=>readReproduction(bad));}
});
test('81 rejects duplicate steps, altered setup/pass/terminal criteria and hidden in-world domain continuation',()=>{
 const checks=[
  r=>{r.runs[0].steps.push(structuredClone(r.runs[0].steps[0]));},
  r=>r.runs[0].setup.bodies[0].linear_damping=.1,
  r=>r.runs[0].termination.controller_approved=true,
  r=>{const s=r.runs[25].steps.at(-1);s.post[0].rotation={x:Math.sin(.02/2),y:0,z:0,w:Math.cos(.02/2)};s.metrics=stepMetrics(s.pre,s.post,s.commands,s.T);},
  r=>{const s=r.runs[15].steps[0];s.post[0].rotation={x:Math.sin(.21/2),y:0,z:0,w:Math.cos(.21/2)};s.metrics=stepMetrics(s.pre,s.post,s.commands,s.T);}
 ];
 for(const mutate of checks){const r={...raw,runs:[...raw.runs]};for(const i of [0,15,25])r.runs[i]=structuredClone(raw.runs[i]);mutate(r);assert.throws(()=>validateReviewed(r,head));}
});
