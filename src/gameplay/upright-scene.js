import * as THREE from 'three';
import R from '@dimforge/rapier3d-compat';
import {createUprightRun} from './upright-run.js';
import {pickBody} from '../grab.js';
import {PlaygroundCameras,CAMERA_VIEWS} from './playground-cameras.js';
import {PlaygroundViewports,pointerNdc} from './playground-viewports.js';
import {optionsFromSearch,variantOptions,variantId} from './upright-variants.js';
import {PlaygroundFeedback} from './playground-feedback.js';
import {BODY_LABELS} from './playground-inspection.js';
import {PlaygroundInspectionView} from './playground-inspection-view.js';
import './upright.css';
import './playground-editor.css';

const $=id=>document.getElementById(id);
const build=__GAMEPLAY_BUILD__;
const playground=document.body.dataset.playground==='true';
const feedback=new PlaygroundFeedback();
let run=1;
const sessionId=crypto.randomUUID();
try{
  await R.init();
  let options=optionsFromSearch(location.search);
  function sessionOptions(){return {audit:!playground,record:!playground,
    runPolicy:playground?{mode:'free',timerSteps:$('timer').value?Number($('timer').value)*60:null}:{mode:'historical'},
    speed:playground?Number($('speed').value):1,
    resetOptions:{assisted:$('assisted').checked,obstacle:$('obstacle').checked}};}
  let {sim,session}=createUprightRun(options,sessionOptions());
  // V2 changes only the observation duration; same B/controller/step path.
  if(!playground&&new URLSearchParams(location.search).get('observe')==='v2'){session.windowLimit=360;document.querySelector('details p:last-child').textContent='V2: up to 6 s, then pause; not gameplay acceptance.';}
  if(!playground&&new URLSearchParams(location.search).get('observe')==='return'){
    session.windowLimit=720;
    document.querySelector('details p:last-child').textContent='Return diagnosis: up to 12 s; pre-armed steps only, not full gameplay acceptance.';
    window.uprightArmTrial=plan=>session.armTrial(plan);
  }
  const canvas=document.querySelector('canvas'),view=$('view');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setClearColor(0x152832);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene=new THREE.Scene();
  let camera=new THREE.PerspectiveCamera(36,1,.1,40),controls=null,cameraViews=null,viewports=null,inspection=null,inspectionMode=false;
  camera.position.set(3.8,2.7,6);camera.lookAt(.35,1.05,0);
  scene.add(new THREE.HemisphereLight(0xe6ffef,0x31444c,2.2));
  const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(-3,6,4);scene.add(light);
  const resources=[],meshes=new Map();
  const material=new THREE.MeshStandardMaterial({color:0x91b657,roughness:.78});
  const feetMaterial=new THREE.MeshStandardMaterial({color:0x557646,roughness:.88});
  const floorMaterial=new THREE.MeshStandardMaterial({color:0x38515a,roughness:1});
  const blockMaterial=new THREE.MeshStandardMaterial({color:0xc48249,roughness:.85});
  resources.push(material,feetMaterial,floorMaterial,blockMaterial);
  function mesh(geometry,mat){resources.push(geometry);const m=new THREE.Mesh(geometry,mat);scene.add(m);return m;}
  const floor=mesh(new THREE.BoxGeometry(12,.4,12),floorMaterial);floor.position.y=-.2;
  const grid=new THREE.GridHelper(12,24,0x6a8987,0x49646b);grid.position.y=.002;scene.add(grid);resources.push(grid.geometry,grid.material);
  const block=mesh(new THREE.BoxGeometry(.7,1.3,1.4),blockMaterial);block.position.set(1.35,.65,0);
  for(const {spec} of sim.rig.byId.values()){
    const s=spec.shape,g=s.type==='capsule'?new THREE.CapsuleGeometry(s.radius,s.half*2,6,12):
      s.type==='ball'?new THREE.SphereGeometry(s.radius,16,12):new THREE.BoxGeometry(s.half.x*2,s.half.y*2,s.half.z*2);
    meshes.set(spec.id,mesh(g,spec.id.startsWith('foot')?feetMaterial:material));
  }
  function figureBounds(){sync();const bounds=new THREE.Box3();for(const m of meshes.values())bounds.expandByObject(m);return bounds;}
  const cameraPointers=new Map(),inputCleanup=[];let disposed=false;
  function resizeViews(){const rects=viewports.resize(view.clientWidth,view.clientHeight,cameraPointers.size>0);cameraViews.resize(rects);cameraViews.lock(sim.grab.active,rects);}
  function activateCamera(mode){viewports.select(mode);cameraViews.select(mode);resizeViews();camera=cameraViews.camera;controls=cameraViews.controls;}
  if(playground){
    viewports=new PlaygroundViewports(view);
    cameraViews=new PlaygroundCameras(viewports.targets,figureBounds());resizeViews();camera=cameraViews.camera;controls=cameraViews.controls;
    const selectCamera=mode=>{
      if(sim.grab.active||cameraPointers.size){$('cameraViewStatus').textContent='View locked: finish the active gesture first.';return;}
      activateCamera(mode);update();
    };
    for(const [id,mode] of Object.entries({cameraPerspective:'perspective',cameraFront:'front',side:'side',cameraTop:'top'}))$(id).onclick=()=>selectCamera(mode);
    $('cameraReset').onclick=()=>{if(!sim.grab.active&&!cameraPointers.size)cameraViews.reset();};
    for(const [id,layout] of [['cameraQuad','quad'],['cameraSingle','single']])$(id).onclick=()=>{if(sim.grab.active||cameraPointers.size)return;viewports.setLayout(layout);resizeViews();update();};
    for(const [mode,surface] of viewports.targets)surface.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectCamera(mode);}});
    // Capture routing runs before OrbitControls. A gesture owns its view until all its pointers release.
    view.addEventListener('pointerdown',ev=>{
      const r=view.getBoundingClientRect(),hit=viewports.hit(ev.clientX-r.left,ev.clientY-r.top);
      if(!hit)return;
      const owner=cameraPointers.values().next().value;
      if(sim.grab.active||(owner&&owner!==hit.id)){ev.stopImmediatePropagation();ev.preventDefault();return;}
      if(!owner)activateCamera(hit.id);cameraPointers.set(ev.pointerId,hit.id);update();
    },true);
    view.addEventListener('wheel',ev=>{
      if(sim.grab.active||cameraPointers.size){ev.stopImmediatePropagation();ev.preventDefault();return;}
      const r=view.getBoundingClientRect(),hit=viewports.hit(ev.clientX-r.left,ev.clientY-r.top);if(hit)activateCamera(hit.id);
    },{capture:true,passive:false});
    const releaseCameraPointer=ev=>queueMicrotask(()=>{if(disposed||!cameraPointers.delete(ev.pointerId))return;resizeViews();update();});
    for(const type of ['pointerup','pointercancel','lostpointercapture']){
      document.addEventListener(type,releaseCameraPointer,true);inputCleanup.push(()=>document.removeEventListener(type,releaseCameraPointer,true));
    }
    $('cameraFrame').onclick=()=>{if(!sim.grab.active&&!cameraPointers.size)cameraViews.frame(figureBounds());};
    $('cameraMode').onchange=()=>{if(sim.grab.active||cameraPointers.size){$('cameraMode').checked=cameraViews.navigation;return;}cameraViews.setNavigation($('cameraMode').checked);if($('cameraMode').checked){inspectionMode=false;$('inspectMode').checked=false;}update();};
    view.addEventListener('contextmenu',ev=>ev.preventDefault());
    inspection=new PlaygroundInspectionView(scene,meshes,{floor,grid,material,feetMaterial},$('inspectionPanel'));inspection.rebind(sim);
    $('inspectMode').onchange=()=>{if(sim.grab.active||cameraPointers.size){$('inspectMode').checked=inspectionMode;return;}inspectionMode=$('inspectMode').checked;if(inspectionMode){$('inspectionPanel').open=true;$('cameraMode').checked=false;cameraViews.setNavigation(false);}update();};
    const axes=new THREE.AxesHelper(1.15);axes.setColors(0xff5148,0x58df70,0x4b9eff);axes.position.y=.025;scene.add(axes);resources.push(axes.geometry,axes.material);
  }
  let pointerId=null,lastFrame=null,lastHitToken=null,frameIntervals=[],stepCosts=[];
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),dragPlane=new THREE.Plane(),dragPoint=new THREE.Vector3();
  function ray(ev){const r=canvas.getBoundingClientRect(),rect=viewports?.rect()||{x:0,y:0,width:r.width,height:r.height};const ndc=pointerNdc(rect,ev.clientX-r.left,ev.clientY-r.top);pointer.set(ndc.x,ndc.y);camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);}
  function cancelPointer(reason){
    const id=pointerId;pointerId=null;sim.grab.cancel(reason);
    if(cameraViews)cameraViews.lock(false,viewports.rects);else if(controls)controls.enabled=true;
    if(id!==null&&view.hasPointerCapture(id))view.releasePointerCapture(id);
  }
  function pause(reason){session.pause(reason);cancelPointer(reason);lastFrame=null;update();}
  function observePause(reason){
    const context=session.observePause(reason);
    if(pointerId!==null)cancelPointer(context.reason);
    lastFrame=null;update();return {...context,snapshot_timing:'before-pause-request'};
  }
  function freshRun(reason){
    cancelPointer(reason);const windowLimit=session.windowLimit;session.dispose();
    ({sim,session}=createUprightRun(options,sessionOptions()));
    if(!playground)session.windowLimit=windowLimit;
    inspection?.rebind(sim);run++;clearFeedback();frameIntervals=[];stepCosts=[];lastFrame=null;lastHitToken=null;$('input').textContent='Fresh reset · start required';sync();update();
  }
  function reset(){freshRun('reset');}
  function move(ev,final=false){if(session.paused)return;ray(ev);if(sim.grab.active&&raycaster.ray.intersectPlane(dragPlane,dragPoint))sim.grab.move(dragPoint,ev.timeStamp/1000,final);}
  view.addEventListener('pointerdown',ev=>{
    if(pointerId!==null||!ev.isPrimary||ev.button!==0||$('cameraMode')?.checked)return;
    if(inspectionMode){ray(ev);const hit=pickBody(R,sim.world,sim.rig.byBody.keys(),raycaster.ray.origin,raycaster.ray.direction);inspection.select(hit?sim.rig.byBody.get(hit.body.handle).spec.id:null);ev.preventDefault();return;}
    if(session.paused||sim.invalid)return;
    ray(ev);const hit=pickBody(R,sim.world,sim.rig.byBody.keys(),raycaster.ray.origin,raycaster.ray.direction);if(!hit)return;
    dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.hit.point);
    if(!sim.beginGrab(hit.body,hit.hit.point,ev.timeStamp/1000))return;
    if(cameraViews)cameraViews.lock(true,viewports.rects);else if(controls)controls.enabled=false;
    pointerId=ev.pointerId;view.setPointerCapture(pointerId);ev.preventDefault();
    const id=sim.rig.byBody.get(hit.body.handle).spec.id;session.event('grab-begin',{body:id,point:hit.hit.point});
    $('input').textContent='Grab: '+id+' · assistance off';update();
  },true);
  view.addEventListener('pointermove',ev=>{if(ev.pointerId===pointerId){move(ev);ev.preventDefault();}});
  view.addEventListener('pointerup',ev=>{
    if(ev.pointerId!==pointerId)return;move(ev,true);sim.grab.release(ev.timeStamp/1000);
    session.event('grab-release',{release:sim.grab.diagnostics.lastRelease});cancelPointer('release');update();
  });
  for(const type of ['pointercancel','lostpointercapture'])view.addEventListener(type,ev=>{if(ev.pointerId===pointerId){cancelPointer(type);session.event('pointer-cancel',{reason:type});update();}});
  $('play').onclick=()=>{if(session.paused){session.resume();lastFrame=null;$('input').textContent='Simulation running';}else observePause('pause');update();};
  $('safetyStop').onclick=()=>pause('manual-safety-stop');
  $('step').onclick=()=>{session.singleStep();sync();inspection?.update(sim,performance.now(),true);update();};
  $('reset').onclick=reset;
  if(playground){
    $('speed').onchange=()=>{session.setSpeed(Number($('speed').value));lastFrame=null;update();};
    $('timer').onchange=()=>{$('input').textContent='Timer selection applies after reset or variant change.';};
    $('variant').value=variantId(options);
    $('variant').onchange=()=>{
      options=variantOptions($('variant').value);freshRun('variant-change');
      const url=new URL(location.href);url.search='';url.searchParams.set('variant',$('variant').value);history.replaceState(null,'',url);
      $('input').textContent='Variant changed · fresh run · start required';sync();update();
    };
    for(const [id,label] of Object.entries(BODY_LABELS)){
      if(!sim.rig.byId.has(id))continue;const option=document.createElement('option');option.value=id;option.textContent=label;$('body').append(option);
    }
    $('mark').onclick=()=>{
      const marker=feedback.mark(identity(),sim.steps,()=>sim.snapshot(),browserContext,()=>observePause('marker'));
      $('feedbackStatus').textContent='Marked step '+marker.step+' · run '+run+(marker.data_errors.length?' · some state data unavailable':'');update();
      $('feedbackPanel').open=true;
    };
    $('feedbackExport').onclick=()=>{
      try{
        const result=feedback.report(identity(),{body_id:$('body').value||null,category:$('category').value,note:$('note').value},[...sim.rig.byId.keys()]);
        download(result.json,'goblin-playground-'+variantId(options)+'-run-'+run+'-step-'+feedback.marker.step+'.json');
        $('feedbackStatus').textContent=result.diagnostic?'Diagnostic report downloaded; missing data identified.':'Feedback JSON downloaded.';
      }catch(error){$('feedbackStatus').textContent=error.message;}
    };
  }
  function clearFeedback(){feedback.clear();if(playground){$('note').value='';$('body').value='';$('category').value='other';$('feedbackStatus').textContent='No marker yet.';}}
  function identity(){return {build,variant:variantId(options),options:{...options},run_policy:session.runPolicy,run_id:sessionId+'-'+run};}
  function download(json,name){
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');
    try{a.href=url;a.download=name;document.body.append(a);a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
  for(const [id,strong] of [['small',false],['strong',true]])$(id).onclick=()=>{
    const ok=session.push(strong,$('schedule').checked);
    $('input').textContent=ok?((strong?'Strong':'Small')+' push'+($('schedule').checked?' scheduled at 2 s':'')):'Start required / 2 s already passed';update();
  };
  $('assistOff').onclick=()=>{sim.interrupt('manual-assist-off');session.event('assist-off');$('input').textContent='Assistance turned off · remains off until reset';update();};
  function sync(){for(const {spec,body} of sim.rig.byId.values()){const m=meshes.get(spec.id);m.position.copy(body.translation());m.quaternion.copy(body.rotation());}block.visible=sim.obstacleEnabled;scene.updateMatrixWorld(true);}
  function project(point,mode=cameraViews?.mode){const c=cameraViews?cameraViews.states.get(mode).camera:camera,p=new THREE.Vector3(point.x,point.y,point.z).project(c),r=canvas.getBoundingClientRect(),rect=viewports?.rect(mode)||{x:0,y:0,width:r.width,height:r.height};return {x:r.left+rect.x+(p.x+1)*rect.width/2,y:r.top+rect.y+(1-p.y)*rect.height/2};}
  function update(){
    $('step').disabled=!session.paused||!!sim.invalid||sim.steps>=session.windowLimit||document.hidden;
    const reasons={hidden:'page hidden',blur:'focus lost',escape:'Escape',
      'manual-safety-stop':'manual','pause-active-grab':'pause during grab',
      'marker-active-grab':'marker during grab','timer-end-active-grab':'timer during grab','window-limit':'run window ended',safety:'invalid state'};
    $('pauseStatus').textContent=session.paused?(session.pauseContext.kind==='safety'?
      'Safety stop · assistance off · '+(reasons[session.pauseContext.reason]||session.pauseContext.reason):
      session.pauseContext.kind==='observation'?(session.pauseContext.reason==='timer-end'?'Timer reached · state preserved · resume available':'Observation paused · state preserved'):'Fresh run · start required'):
      'Simulation running · pause preserves state';
    if(playground){
      for(const id of ['inspectMode','inspectBody','inspectJoint','cameraMode','cameraReset','cameraFrame','cameraPerspective','cameraFront','side','cameraTop','cameraQuad','cameraSingle'])$(id).disabled=sim.grab.active||cameraPointers.size>0;
      $('cameraViewStatus').textContent=sim.grab.active?'View locked: release the body grab first.':cameraPointers.size?'View locked: finish the active gesture first.':CAMERA_VIEWS[cameraViews.mode].label+' · '+(camera.isOrthographicCamera?'orthographic':'perspective');
      $('hint').textContent=inspectionMode?'Select a body to inspect · no grab or impulse':cameraViews.navigation?(camera.isOrthographicCamera?'Pan camera · two fingers pan and zoom':'Rotate camera · two fingers pan and zoom'):'Grab a body and drag · release to throw';
      for(const [id,mode] of Object.entries({cameraPerspective:'perspective',cameraFront:'front',side:'side',cameraTop:'top'}))$(id).setAttribute('aria-pressed',String(cameraViews.mode===mode));
      $('cameraQuad').setAttribute('aria-pressed',String(viewports.layout==='quad'));$('cameraSingle').setAttribute('aria-pressed',String(viewports.layout==='single'));
      $('feedbackExport').disabled=!feedback.marker;
      const state={SETTLING:'Settling',ASSISTED_READY:'Assisted upright',DYNAMIC:'Free dynamics',DOWN:'Down',STOPPED:'Safety stop'};
      const safety=session.pauseContext.kind==='safety'&&session.paused;
      $('status').dataset.state=safety?'safety':session.paused?'paused':'running';
      const phase=(safety?'Safety: '+(reasons[session.pauseContext.reason]||session.pauseContext.reason):(session.paused?(session.pauseContext.reason==='timer-end'?'Timer reached':'Paused'):'Running')+' · '+(state[sim.state]||sim.state));
      if($('phaseStatus').textContent!==phase)$('phaseStatus').textContent=phase;
      // Time/steps remain visible without frame-by-frame live-region announcements.
      $('stepStatus').textContent=' · '+(sim.steps/60).toFixed(2)+' s · #'+sim.steps;
      $('status').title=$('pauseStatus').textContent;
      $('runOptions').textContent=session.runPolicy.timerSteps===null?'Free run · timer off':
        'Run timer: '+session.runPolicy.timerSteps/60+' s simulation'+(session.timerReached?' · already reached':'');
      const assist='Assist '+(sim.enabled?'on':'off');
      if($('assistStatus').textContent!==assist)$('assistStatus').textContent=assist;
      $('assistStatus').title='Target: '+sim.targetAssist().phase+'; assistance stays off after safety until reset';
      $('identity').textContent='Build '+build.build_id+' · variant '+variantId(options)+' · run '+run;
    }
    $('play').textContent=session.paused?(sim.steps>=session.windowLimit?'Window ended':playground?'Run':'Start / resume'):'Pause';
    $('play').disabled=!!sim.invalid||sim.steps>=session.windowLimit||document.hidden;
    $('small').disabled=$('strong').disabled=session.paused||!!sim.invalid;
    if(!playground)$('status').textContent=(session.paused?'PAUSE · ':'')+sim.state+' · t='+(sim.steps/60).toFixed(2)+' s\nAssist '+(sim.enabled?'ON':'OFF')+' · '+sim.reason+'\nUp '+sim.upAssist().phase+' · '+Math.round(sim.upAssist().factor*100)+' % · '+sim.yieldProfile+'\nTarget '+sim.targetAssist().id+' · '+sim.targetAssist().phase+' · '+(sim.targetAssist().angle*180/Math.PI).toFixed(2)+'° · designed gameplay assistance'+(session.lastRun?'\nLast physics step: '+session.lastRun.final.state:'');
    const token=sim.lastHit?sim.lastHit.step+':'+sim.lastHit.strength:null;
    if(token!==null&&token!==lastHitToken){lastHitToken=token;$('input').textContent=(sim.lastHit.strength===3.2?'Strong':'Small')+' push triggered · t='+(sim.lastHit.step/60).toFixed(2)+' s';}
    $('metrics').textContent='t '+(sim.steps/60).toFixed(2)+' s · torso '+(sim.metrics.torsoTilt*180/Math.PI).toFixed(3)+'° · motor cap '+sim.commands.motorCap+' Nm · support command '+sim.commands.support.toFixed(2)+' N · bodies/joints '+sim.world.bodies.len()+'/'+sim.world.impulseJoints.len();
  }
  const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const environment={userAgent:navigator.userAgent,platform:navigator.platform,get dpr(){return devicePixelRatio;},get renderDpr(){return renderer.getPixelRatio();},
    backend:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webgl:gl.getParameter(gl.VERSION)};
  function cameraSnapshot(){return cameraViews?cameraViews.snapshot():{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,projection:camera.projectionMatrix.toArray(),view:camera.matrixWorldInverse.toArray()};}
  function readInspectionAtMarker(){inspection.update(sim,performance.now(),true);return inspection.snapshot().readout;}
  function browserContext(){return {environment,run_controls:{speed:session.speed,timerReached:session.timerReached},camera:cameraSnapshot(),inspection:inspection?{...inspection.snapshot(),readout:inspection.selected?readInspectionAtMarker():null}:null,viewports:viewports?{...viewports.snapshot(),cameras:[...cameraViews.states.keys()].map(id=>cameraViews.snapshot(id))}:null,viewport:{width:innerWidth,height:innerHeight,canvas:{width:canvas.clientWidth,height:canvas.clientHeight}}};}
  function report(){camera.updateMatrixWorld(true);return {build,environment,observationIdentity:{mass:sim.mass,dt:1/60,nativeTimestep:sim.world.timestep,config:sim.config,yieldProfile:sim.yieldProfile,reaction:sim.reaction,returnProfile:sim.returnProfile,returnSource:build.return_sha256,gravity:{...sim.world.gravity},sources:build.physics_sha256},
    observationCamera:{...cameraSnapshot(),canvas:{width:canvas.clientWidth,height:canvas.clientHeight}},viewport:{width:innerWidth,height:innerHeight,canvas:{width:canvas.clientWidth,height:canvas.clientHeight}},...session.report(),lastPhysicsState:session.trace.at(-1)?.state,frameIntervals:frameIntervals.slice(),stepCosts:stepCosts.slice()};}
  const renderSamples=[];
  window.uprightDiagnostics=()=>({...report(),inspection:inspection?.snapshot()??null,viewports:viewports?{...viewports.snapshot(),views:viewports.rects.map(rect=>({...rect,camera:cameraViews.snapshot(rect.id),step:sim.steps,parts:[...sim.rig.byId.values()].map(({spec,body})=>({id:spec.id,screen:project(body.translation(),rect.id)}))}))}:null,renderSamples:renderSamples.slice(),cameraPointers:cameraPointers.size,runIdentity:identity(),rendererMemory:{...renderer.info.memory},pointerId,parts:[...sim.rig.byId.values()].map(({spec,body})=>({id:spec.id,screen:project(body.translation())})),blockScreen:project({x:1.35,y:1,z:0})});
  window.uprightTrace=()=>({build,environment,...(session.lastRun||session.report())});
  window.uprightStepState=()=>({steps:sim.steps,paused:session.paused,invalid:sim.invalid});
  if(!playground)$('export').onclick=()=>download(JSON.stringify(report(),null,2),'goblin-step-trace.json');
  if(!playground)$('identity').textContent='Build '+build.revision.slice(0,12)+' · Controller '+build.controller_sha256.slice(0,12)+' · Return '+sim.returnProfile;
  for(const id of ['play','reset','assistOff','safetyStop',...(playground?['mark','variant']:['export'])])$(id).disabled=false;
  function suspend(){pause(document.hidden?'hidden':'blur');}
  addEventListener('blur',suspend);
  addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!ev.repeat){ev.preventDefault();pause('escape');}});
  document.addEventListener('visibilitychange',()=>{session.event('visibility',{hidden:document.hidden});if(document.hidden)suspend();else{session.clock.reset();update();}});
  let width=0,height=0,renderDpr=0,renderLast=null;
  renderer.info.autoReset=false;
  function render(ms){
    const frameStart=performance.now(),w=view.clientWidth,h=view.clientHeight,dpr=Math.min(devicePixelRatio,1.5);
    if(dpr!==renderDpr){renderDpr=dpr;renderer.setPixelRatio(dpr);}
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);if(cameraViews)resizeViews();else{camera.aspect=w/h;camera.updateProjectionMatrix();}}
    if(!playground&&!session.paused&&lastFrame!==null)frameIntervals.push(ms-lastFrame);
    lastFrame=ms;
    const before=sim.steps,start=performance.now();session.tick(ms/1000);
    if(!playground&&sim.steps>before)stepCosts.push({steps:sim.steps-before,ms:performance.now()-start}); // Includes read-only observer cost.
    if(session.paused&&pointerId!==null)cancelPointer('window-end');
    const tickMs=performance.now()-start;sync();inspection?.update(sim,ms);const renderStart=performance.now();renderer.info.reset();
    if(viewports){
      renderer.setScissorTest(true);
      for(const rect of viewports.rects){
        const y=height-rect.y-rect.height;renderer.setViewport(rect.x,y,rect.width,rect.height);renderer.setScissor(rect.x,y,rect.width,rect.height);
        renderer.render(scene,cameraViews.states.get(rect.id).camera);
      }
      renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);
    }else renderer.render(scene,camera);
    const renderSubmitMs=performance.now()-renderStart;update();
    if(playground){renderSamples.push({layout:viewports.layout,step:sim.steps,tickMs,renderSubmitMs,cpuMs:performance.now()-frameStart,intervalMs:renderLast===null?null:ms-renderLast,views:viewports.rects.length,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});if(renderSamples.length>240)renderSamples.shift();}
    renderLast=ms;
  }
  sync();update();renderer.setAnimationLoop(render);
  function dispose(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);cancelPointer('destroy');
    for(const [id,mode] of cameraPointers){const surface=viewports.targets.get(mode);if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);}cameraPointers.clear();
    cameraViews?.dispose();viewports?.dispose();inspection?.dispose();for(const cleanup of inputCleanup)cleanup();session.dispose();for(const r of resources)r.dispose();renderer.dispose();}
  addEventListener('pagehide',dispose,{once:true});
}catch(error){console.error(error);$('status').dataset.state='error';const target=$('phaseStatus')||$('status');target.textContent='Initialization failed: '+error.message;}
