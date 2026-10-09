// Post-execution stored-data regressions only, never additional worlds.
import fs from 'node:fs';import assert from 'node:assert/strict';import {validate} from './smalltilt79-reader.mjs';
const raw=JSON.parse(fs.readFileSync(process.argv[2])),head=process.argv[3];const result=validate(raw,head),mutations=[
 ['missing world',r=>r.runs.pop()],['duplicate world',r=>r.runs[1]=structuredClone(r.runs[0])],['wrong order',r=>[r.runs[0],r.runs[1]]=[r.runs[1],r.runs[0]]],
 ['missing step',r=>r.runs[0].steps.pop()],['phase duplicate',r=>r.runs[0].steps[0].phase.push(r.runs[0].steps[0].phase[0])],
 ['modified torque',r=>r.runs[0].steps[0].accumulators[0].x+=.001],['dt multiplication',r=>r.runs[0].steps[0].commands.encoded_pair[0][0]/=60],
 ['wrong PRE',r=>r.runs[0].steps[0].pre[0].world_com.x+=.1],['wrong POST',r=>r.runs[0].steps[0].post[0].angular_velocity.x+=.1],
 ['false terminal',r=>r.runs.at(-1).termination.pass=!r.runs.at(-1).termination.pass],['fake approval',r=>r.controller_approved=true],['fake decision',r=>r.decision='local_smalltilt_supported'],
 ['metadata hash',r=>r.provenance.config_sha256='0'.repeat(64)],['wrong harness',r=>r.provenance.git_commit='0'.repeat(40)],['nonfinite',r=>r.runs[0].pre[0].mass=NaN],['unknown state field',r=>r.runs[0].pre[0].unexpected=0],
 ['false H',r=>r.runs[0].steps[0].metrics.physical_delta_H[0]+=.1],['false reference',r=>r.runs[0].steps[0].reference.H_error+=.1],['unknown config getter',r=>r.runs[0].setup.integration.foo=0]
];
const rejected=[];for(const [name,mutate]of mutations){const r=structuredClone(raw);mutate(r);assert.throws(()=>validate(r,head),name);rejected.push(name);}console.log(JSON.stringify({result,rejected,new_worlds:0}));
