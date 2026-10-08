// Explicit diagnostic budget only, never imported by tests/CI or study runner.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {PLAN} from './fullrig84-model.mjs';
import {StudyWorld,init} from './fullrig84-world.mjs';
import {worldDecision,commandCheck} from './fullrig84-reader.mjs';
const [ordinalText,output]=process.argv.slice(2),trial=PLAN.order[Number(ordinalText)-1];
assert.ok(trial&&output);fs.mkdirSync(output);const save=(n,x)=>fs.writeFileSync(output+'/'+n+'.json',JSON.stringify(x)+'\n');
await init();const sim=new StudyWorld(trial),run={trial,initial:null,frames:[],decision:null};let attempts=0,steps=0,phase='allocate';
try{attempts++;save('budget',{attempts,steps,trial});sim.allocate();phase='initial';run.initial=sim.snapshot(true);save('initial',run.initial);run.decision=worldDecision(run);assert.equal(run.decision.kind,'incomplete');phase='command';const pre=sim.snapshot(true),command=sim.prepare(pre),classification=commandCheck(pre,command,trial.variant);save('pre-command',{pre,command,classification});phase='step';steps++;save('budget',{attempts,steps,trial});sim.step();phase='POST';const post=sim.snapshot(false),cleared=sim.clear();run.frames.push({pre,command,command_classification:classification,post,cleared,cpu:{physics_ms:0,command_ms:0,observation_ms:0}});save('run',run);phase='reader';run.decision=worldDecision(run);save('result',{kind:'diagnostic_only_no_parameter_selection',attempts,steps,decision:run.decision});console.log(JSON.stringify({attempts,steps,decision:run.decision}));}
catch(e){save('failure',{phase,attempts,steps,message:e.stack,run});console.log(JSON.stringify({phase,attempts,steps,error:e.message}));process.exitCode=1;}finally{sim.dispose();}
