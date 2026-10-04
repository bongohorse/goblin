import * as THREE from 'three';
import {StandingSimulation,initRapier} from './simulation.js';
import {LabClock} from './clock.js';
import {motorExperiment} from './motor-config.js';
import {modelExperiment} from './model-config.js';
import './style.css';

const panel=document.querySelector('#readout');
async function start(){
  await initRapier();const metadata={...__STANDING_BUILD__,platform:{os:navigator.platform,runtime:'browser',host:location.host,user_agent:navigator.userAgent}};
  let sim=new StandingSimulation(undefined,metadata),generation=1;const clock=new LabClock(sim.config.fixed_dt);
  const host=document.querySelector('#view'),renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#19222c');
  const camera=new THREE.PerspectiveCamera(40,1,.05,50);camera.position.set(4,2.8,5);camera.lookAt(0,1.25,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x63705c,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,5,4);scene.add(light);
  const meshes=new Map(),owned=[];
  const material=new THREE.MeshStandardMaterial({color:0x9fbf72,roughness:.8}),footMaterial=new THREE.MeshStandardMaterial({color:0xdeb46b,roughness:.8});owned.push(material,footMaterial);
  for(const spec of sim.config.bodies){const s=spec.shape;const geometry=s.type==='ball'?new THREE.SphereGeometry(s.radius,16,12):s.type==='capsule'?new THREE.CapsuleGeometry(s.radius,s.half*2,4,12):new THREE.BoxGeometry(s.half.x*2,s.half.y*2,s.half.z*2);owned.push(geometry);const mesh=new THREE.Mesh(geometry,spec.body_class==='foot'?footMaterial:material);scene.add(mesh);meshes.set(spec.id,mesh);}
  const f=sim.config.floor,fg=new THREE.BoxGeometry(f.half.x*2,f.half.y*2,f.half.z*2),fm=new THREE.MeshStandardMaterial({color:0x42535c,roughness:1});owned.push(fg,fm);const floor=new THREE.Mesh(fg,fm);floor.position.copy(f.position);scene.add(floor);
  const bindings=[];function listen(target,type,fn){target.addEventListener(type,fn);bindings.push([target,type,fn]);}
  const pause=()=>{sim.paused=true;clock.reset();};
  listen(document.querySelector('#resume'),'click',()=>{if(!sim.terminal)sim.paused=false;clock.reset();});listen(document.querySelector('#pause'),'click',pause);
  listen(document.querySelector('#step'),'click',()=>{pause();sim.step();});listen(document.querySelector('#reset'),'click',()=>{sim.reset();generation++;clock.reset();});
  const selection=document.querySelector('#mode'),description=document.querySelector('#mode-note');
  function describeMode(){const a=sim.motor?.config;description.textContent=a?`Native ${a.model} ${a.stiffness}/${a.damping}, ${a.gain_units??'Nm/rad;Nm*s/rad'}, Moving-Frame targets, Solver32. ${sim.experiment.comparison_question==='scalar-calibrated'?'Scalar fixture calibration only; no equivalence across rig axes. ':''}Lab candidate; actual motor torque/saturation unavailable.60s is only the time criterion.`:'Passive v1, Solver8, no active motors. Original baseline unchanged.';}
  listen(selection,'change',()=>{const key=selection.value;const next=key==='passive'?null:key.startsWith('study-')?modelExperiment(key.split('-')[1]==='force'?'ForceBased':'AccelerationBased',Number(key.split('-')[2]),key.split('-')[1]==='calibrated'):motorExperiment(key==='motor1'?1:20);const previous=sim;sim=new StandingSimulation(undefined,metadata,next);previous.dispose();generation++;clock.reset();describeMode();});
  describeMode();
  listen(document,'visibilitychange',pause);
  const exportButton=document.querySelector('#export');exportButton.disabled=false;
  listen(exportButton,'click',async()=>{
    try{
      const result=await sim.result(),url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download=result.run_id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);
    }catch(error){panel.textContent='Export failed: '+error.message;console.error(error);}
  });
  let lastWidth=0,lastHeight=0;
  function frame(now){
    clock.advance(now/1000,sim.paused||!!sim.terminal,()=>sim.step());
    const width=host.clientWidth,height=host.clientHeight;if(width!==lastWidth||height!==lastHeight){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();lastWidth=width;lastHeight=height;}
    const state=sim.snapshot();for(const b of state.bodies){meshes.get(b.id).position.copy(b.position);meshes.get(b.id).quaternion.copy(b.rotation);}
    if(document.querySelector('#render').checked)renderer.render(scene,camera);
    const t=sim.telemetry;
    panel.textContent=JSON.stringify({mode:selection.value,controller:sim.motor?.config.controller_id??'none',solver:sim.world.integrationParameters.numSolverIterations,step:sim.steps,time_s:sim.time,paused:sim.paused,termination:sim.terminal?.termination_reason??'incomplete',failure_bodies:sim.terminal?.failure_bodies??[],invalid:sim.invalid,com_m:t?.com,com_velocity_m_s:t?.com_velocity,drift_m:t?.drift,foot_loads_N:t?.foot_loads,joint_anchor_error_m:t?Math.max(...t.joints.map(j=>j.anchor_error)):null,joint_limit_violation_rad:t?Math.max(...t.joints.map(j=>j.limit_violation??0)):null,...(sim.motor?{axis_cap_Nm:sim.motor.config.max_torque_Nm,motor_effort:'N/A: contact/limit impulses not separable',motor_saturation:'N/A',target_tracking:t?.motor_tracking}:{}),...sim.counts()},null,2);
  }
  renderer.setAnimationLoop(frame);
  // Lab-only diagnostics; no production dependency or physical transform mutation.
  window.standingLab={snapshot:()=>sim.snapshot(),result:()=>sim.result(),counts:()=>sim.counts(),timings:()=>({physics:sim.physicsTimes.slice(),commands:sim.commandTimes.slice(),observation:sim.observationTimes.slice()}),diagnostics:()=>({generation,mode:selection.value,controller:sim.motor?.config.controller_id??'none',solver:sim.world.integrationParameters.numSolverIterations,motor_entries:sim.motor?.entries.length??0,run_id:sim.runId,step:sim.steps,paused:sim.paused,invalid:sim.invalid,termination:sim.terminal,...sim.counts(),listeners:bindings.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs.length}),destroy(){renderer.setAnimationLoop(null);sim.dispose();bindings.forEach(([t,e,f])=>t.removeEventListener(e,f));owned.forEach(r=>r.dispose());renderer.dispose();renderer.domElement.remove();delete window.standingLab;}};
  listen(window,'pagehide',()=>window.standingLab?.destroy());
}
start().catch(error=>{panel.textContent='Lab failed: '+error.message;console.error(error);});
