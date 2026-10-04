// Issue #41 blocked-Gate reproduction. Not a Standing result or second production step path.
import R from '@dimforge/rapier3d-compat';
import fs from 'node:fs';
import os from 'node:os';
import {execSync} from 'node:child_process';
import {StandingSimulation,initRapier} from '../src/labs/standing/simulation.js';
import {BASELINE} from '../src/labs/standing/config.js';
import {compareResults} from '../src/labs/standing/compare.js';
import {commandMotor,neutralMotorConfig,sphericalMotorView} from '../src/labs/standing/motors.js';
import {jointObservation} from '../src/labs/standing/math.js';
await initRapier();
const report={diagnostic_only:true,accepted_standing_evidence:false,command:'node scripts/standing-motor-diagnostic.js',base:'06b520628502593d034485ee21fb8428daa6781b',git_commit:execSync('git rev-parse HEAD',{encoding:'utf8'}).trim(),dirty:!!execSync('git status --porcelain',{encoding:'utf8'}).trim(),node:process.version,os:os.platform()+' '+os.release(),rapier:R.version(),motor_runs:[]};
// Exactly the original reference and the single predeclared safety correction, no sweep.
for(const cap of [20,1]){
  const sim=new StandingSimulation();try{
    const config={...neutralMotorConfig(BASELINE),max_torque_Nm:cap};
    const entries=[...sim.joints.values()].map(e=>{
      const descriptor=e.spec.type==='spherical'?R.JointData.spherical(e.spec.anchorA,e.spec.anchorB):null;
      return {...e,joint:descriptor?sphericalMotorView(sim.world,e.joint,descriptor):e.joint,frame:{...e.joint.frameX1()},target:config.targets.find(t=>t.id===e.spec.id).target};
    });
    while(!sim.terminal){for(const e of entries)commandMotor(e.joint,e.spec.type,e.target,config,e.frame);sim.step();}
    const constraints=[...sim.joints.values()].map(jointObservation);
    report.motor_runs.push({config,steps:sim.steps,observed_time_s:sim.time,termination:sim.terminal,invalid_detail:sim.invalid,max_anchor_error_m:Math.max(...constraints.map(c=>c.anchor_error)),constraints});
  }finally{sim.dispose();}
}
const passive=new StandingSimulation();try{while(!passive.terminal)passive.step();const result=await passive.result(),reference=JSON.parse(fs.readFileSync('docs/research/standing-lab/review-39/baseline/run-1.json','utf8'));report.passive={config_id:result.config_id,steps:result.simulation_steps,standing_time:result.standing_time,failure_bodies:result.failure_bodies,termination_reason:result.termination_reason,original_checkpoint_comparison:compareResults(reference,result)};}finally{passive.dispose();}
console.log(JSON.stringify(report,null,2));
if(process.env.GOBLIN_MOTOR_DIAGNOSTIC_OUTPUT)fs.writeFileSync(process.env.GOBLIN_MOTOR_DIAGNOSTIC_OUTPUT,JSON.stringify(report,null,2)+'\n');
if(report.motor_runs.some(r=>r.termination.termination_reason==='invalid_simulation'))process.exitCode=2;
