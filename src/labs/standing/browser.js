import * as THREE from 'three';
import {StandingSimulation,initRapier} from './simulation.js';
import {LabClock} from './clock.js';
import {motorExperiment} from './motor-config.js';
import {modelExperiment} from './model-config.js';
import RAPIER from '@dimforge/rapier3d-compat';
import {FeedbackSession,identityFor,MEASUREMENT} from './feedback.js';
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
  const feedback=new FeedbackSession(),downloadUrls=new Map();let destroyed=false,feedbackBusy=false;
  function download(json,name){
    if(destroyed)return;
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');
    const timer=setTimeout(()=>{URL.revokeObjectURL(url);downloadUrls.delete(url);},0);downloadUrls.set(url,timer);
    a.href=url;a.download=name;document.body.append(a);try{a.click();}finally{a.remove();}
  }
  const pause=()=>{sim.paused=true;clock.reset();};
  listen(document.querySelector('#resume'),'click',()=>{if(!sim.terminal)sim.paused=false;clock.reset();});listen(document.querySelector('#pause'),'click',pause);
  listen(document.querySelector('#step'),'click',()=>{pause();sim.step();});listen(document.querySelector('#reset'),'click',()=>{sim.reset();generation++;clock.reset();clearObservation();});
  const selection=document.querySelector('#mode'),description=document.querySelector('#mode-note');
  function describeMode(){const a=sim.motor?.config;description.textContent=a?`Native ${a.model} ${a.stiffness}/${a.damping}, ${a.gain_units??'Nm/rad;Nm*s/rad'}, Moving-Frame targets, Solver32. ${sim.experiment.comparison_question==='scalar-calibrated'?'Scalar fixture calibration only; no equivalence across rig axes. ':''}Lab candidate; actual motor torque/saturation unavailable.60s is only the time criterion.`:'Passive v1, Solver8, no active motors. Original baseline unchanged.';}
  listen(selection,'change',()=>{const key=selection.value;const next=key==='passive'?null:key.startsWith('study-')?modelExperiment(key.split('-')[1]==='force'?'ForceBased':'AccelerationBased',Number(key.split('-')[2]),key.split('-')[1]==='calibrated'):motorExperiment(key==='motor1'?1:20);const previous=sim;sim=new StandingSimulation(undefined,metadata,next);previous.dispose();generation++;clock.reset();clearObservation();describeMode();});
  describeMode();
  const markerButton=document.querySelector('#mark'),feedbackButton=document.querySelector('#feedback-export'),feedbackStatus=document.querySelector('#feedback-status');
  const bodyChoice=document.querySelector('#body-id'),category=document.querySelector('#category'),note=document.querySelector('#note');
  for(const spec of sim.config.bodies){const option=document.createElement('option');option.value=spec.id;option.textContent=spec.id;bodyChoice.append(option);}
  const identity=()=>identityFor(sim,metadata,selection.value,RAPIER.version());
  function showIdentity(){
    const id=identity();
    document.querySelector('#identity-summary').textContent=`Build ${id.git_commit.slice(0,12)} · dirty: ${id.dirty} · details`;
    document.querySelector('#run-identity').textContent=`Mode: ${id.mode} · Run: ${id.run_id}`;
    document.querySelector('#identity').textContent=`Commit: ${id.git_commit}\nDirty: ${id.dirty}\nBuild: ${id.build_id}\nMode: ${id.mode}\nRun: ${id.run_id}\nRig: ${id.rig_id}\nController: ${id.controller_id}\nResult schema: ${id.result_schema_version}; Rapier: ${id.rapier_js_version}\nPR / head / base / CI: unknown (not queried)`;
  }
  document.querySelector('#measurement-note').textContent=`Measurement: ${MEASUREMENT.id}. Contact/load data are limited, not validated current support evidence. No Standing acceptance. Native effort / saturation / CoP: N/A. No drift stop.`;
  function clearObservation(){
    feedback.clear();note.value='';document.querySelector('#note-count').textContent='0/2000';bodyChoice.value='';category.value='other';
    feedbackStatus.textContent='No marker. Mark the current step to start.';feedbackButton.disabled=true;showIdentity();
  }
  markerButton.disabled=false;clearObservation();
  listen(markerButton,'click',()=>{
    try{
      const marker=feedback.mark(sim,identity(),pause);
      feedbackStatus.textContent=`Marked step ${marker.step} at ${marker.time_s.toFixed(4)} s. ${marker.snapshot_error?'Snapshot unavailable: '+marker.snapshot_error:'Human observation / hypothesis.'}`;
      feedbackButton.disabled=feedbackBusy;
    }catch(error){feedbackStatus.textContent=error.message;}
  });
  listen(note,'input',()=>{document.querySelector('#note-count').textContent=`${note.value.length}/2000`;});
  listen(feedbackButton,'click',async()=>{
    const capturedRun=sim.runId;
    feedbackBusy=true;feedbackButton.disabled=true;
    try{
      const browser={user_agent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},camera:{position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},rotation:{x:camera.quaternion.x,y:camera.quaternion.y,z:camera.quaternion.z,w:camera.quaternion.w},fov:camera.fov,near:camera.near,far:camera.far}};
      const encoded=await feedback.report(sim,identity(),browser,{body_id:bodyChoice.value||null,category:category.value,note:note.value});
      if(destroyed)return;
      download(encoded.json,`standing-feedback-${encoded.report.identity.run_id}.json`);
      const previous=sim.runId!==capturedRun?'Previous run '+capturedRun+': ':'';
      feedbackStatus.textContent=previous+(encoded.diagnostic?'Diagnostic report downloaded: '+encoded.report.data_errors.map(e=>e.part+': '+e.reason).join('; '):`Feedback downloaded (${encoded.bytes} bytes). Observation, not Standing acceptance.`);
    }catch(error){if(!destroyed)feedbackStatus.textContent='Feedback not exported: '+error.message;}
    finally{feedbackBusy=false;if(!destroyed)feedbackButton.disabled=!feedback.inspect();}
  });
  listen(document,'visibilitychange',pause);
  const exportButton=document.querySelector('#export');exportButton.disabled=false;
  listen(exportButton,'click',async()=>{
    try{
      const result=await sim.result();download(JSON.stringify(result,null,2),result.run_id+'.json');
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
  window.standingLab={snapshot:()=>sim.snapshot(),result:()=>sim.result(),counts:()=>sim.counts(),timings:()=>({physics:sim.physicsTimes.slice(),commands:sim.commandTimes.slice(),observation:sim.observationTimes.slice()}),diagnostics:()=>({generation,mode:selection.value,controller:sim.motor?.config.controller_id??'none',solver:sim.world.integrationParameters.numSolverIterations,motor_entries:sim.motor?.entries.length??0,run_id:sim.runId,step:sim.steps,paused:sim.paused,invalid:sim.invalid,termination:sim.terminal,...sim.counts(),listeners:bindings.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs.length}),destroy(){if(destroyed)return;destroyed=true;feedback.clear();for(const [url,timer] of downloadUrls){clearTimeout(timer);URL.revokeObjectURL(url);}downloadUrls.clear();markerButton.disabled=true;feedbackButton.disabled=true;exportButton.disabled=true;renderer.setAnimationLoop(null);sim.dispose();bindings.forEach(([t,e,f])=>t.removeEventListener(e,f));owned.forEach(r=>r.dispose());renderer.dispose();renderer.domElement.remove();delete window.standingLab;}};
  listen(window,'pagehide',()=>window.standingLab?.destroy());
}
start().catch(error=>{panel.textContent='Lab failed: '+error.message;console.error(error);});
