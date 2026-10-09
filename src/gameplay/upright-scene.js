import * as THREE from 'three';
import R from '@dimforge/rapier3d-compat';
import {createUprightRun} from './upright-run.js';
import {pickBody} from '../grab.js';
import {PlaygroundCameras,CAMERA_VIEWS} from './playground-cameras.js';
import {optionsFromSearch,variantOptions,variantId} from './upright-variants.js';
import {PlaygroundFeedback} from './playground-feedback.js';
import './upright.css';

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
  if(!playground&&new URLSearchParams(location.search).get('observe')==='v2'){session.windowLimit=360;document.querySelector('details p:last-child').textContent='V2: maximal 6 s, dann Pause; keine Gameplay-Abnahme.';}
  if(!playground&&new URLSearchParams(location.search).get('observe')==='return'){
    session.windowLimit=720;
    document.querySelector('details p:last-child').textContent='Rückkehrdiagnose: maximal 12 s; nur vorab armierte Schritte, keine vollständige Gameplay-Abnahme.';
    window.uprightArmTrial=plan=>session.armTrial(plan);
  }
  const canvas=document.querySelector('canvas'),view=$('view');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setClearColor(0x152832);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene=new THREE.Scene();
  let camera=new THREE.PerspectiveCamera(36,1,.1,40),controls=null,cameraViews=null;
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
  if(playground){
    cameraViews=new PlaygroundCameras(canvas,figureBounds());camera=cameraViews.camera;controls=cameraViews.controls;
    const selectCamera=mode=>{
      if(sim.grab.active){$('cameraViewStatus').textContent='Ansicht gesperrt: zuerst den Körpergriff loslassen.';return;}
      cameraViews.select(mode);camera=cameraViews.camera;controls=cameraViews.controls;update();
    };
    for(const [id,mode] of Object.entries({cameraPerspective:'perspective',cameraFront:'front',side:'side',cameraTop:'top'}))$(id).onclick=()=>selectCamera(mode);
    $('cameraReset').onclick=()=>{if(!sim.grab.active)cameraViews.reset();};
    $('cameraFrame').onclick=()=>{if(!sim.grab.active)cameraViews.frame(figureBounds());};
    $('cameraMode').onchange=()=>{if(sim.grab.active){$('cameraMode').checked=cameraViews.navigation;return;}cameraViews.setNavigation($('cameraMode').checked);};
    canvas.addEventListener('contextmenu',ev=>ev.preventDefault());
    const axes=new THREE.AxesHelper(1.15);axes.setColors(0xff5148,0x58df70,0x4b9eff);axes.position.y=.025;scene.add(axes);resources.push(axes.geometry,axes.material);
  }
  let pointerId=null,lastFrame=null,lastHitToken=null,frameIntervals=[],stepCosts=[];
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),dragPlane=new THREE.Plane(),dragPoint=new THREE.Vector3();
  function ray(ev){const r=canvas.getBoundingClientRect();pointer.set((ev.clientX-r.left)/r.width*2-1,-((ev.clientY-r.top)/r.height*2-1));camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);}
  function cancelPointer(reason){
    const id=pointerId;pointerId=null;sim.grab.cancel(reason);
    if(controls)controls.enabled=true;
    if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
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
    run++;clearFeedback();frameIntervals=[];stepCosts=[];lastFrame=null;lastHitToken=null;$('input').textContent='Manueller Reset · Start erforderlich';sync();update();
  }
  function reset(){freshRun('reset');}
  function move(ev,final=false){if(session.paused)return;ray(ev);if(sim.grab.active&&raycaster.ray.intersectPlane(dragPlane,dragPoint))sim.grab.move(dragPoint,ev.timeStamp/1000,final);}
  canvas.addEventListener('pointerdown',ev=>{
    if(session.paused||sim.invalid||pointerId!==null||!ev.isPrimary||ev.button!==0||$('cameraMode')?.checked)return;
    ray(ev);const hit=pickBody(R,sim.world,sim.rig.byBody.keys(),raycaster.ray.origin,raycaster.ray.direction);if(!hit)return;
    dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.hit.point);
    if(!sim.beginGrab(hit.body,hit.hit.point,ev.timeStamp/1000))return;
    if(controls)controls.enabled=false;
    pointerId=ev.pointerId;canvas.setPointerCapture(pointerId);ev.preventDefault();
    const id=sim.rig.byBody.get(hit.body.handle).spec.id;session.event('grab-begin',{body:id,point:hit.hit.point});
    $('input').textContent='Griff: '+id+' · Assist ausgeschaltet';update();
  });
  canvas.addEventListener('pointermove',ev=>{if(ev.pointerId===pointerId){move(ev);ev.preventDefault();}});
  canvas.addEventListener('pointerup',ev=>{
    if(ev.pointerId!==pointerId)return;move(ev,true);sim.grab.release(ev.timeStamp/1000);
    session.event('grab-release',{release:sim.grab.diagnostics.lastRelease});cancelPointer('release');update();
  });
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,ev=>{if(ev.pointerId===pointerId){cancelPointer(type);session.event('pointer-cancel',{reason:type});update();}});
  $('play').onclick=()=>{if(session.paused){session.resume();lastFrame=null;$('input').textContent='Simulation läuft';}else observePause('pause');update();};
  $('safetyStop').onclick=()=>pause('manual-safety-stop');
  $('step').onclick=()=>{session.singleStep();sync();update();};
  $('reset').onclick=reset;
  if(playground){
    $('speed').onchange=()=>{session.setSpeed(Number($('speed').value));lastFrame=null;update();};
    $('timer').onchange=()=>{$('input').textContent='Timerwahl gilt erst nach Reset oder Variantenwechsel.';};
    $('variant').value=variantId(options);
    $('variant').onchange=()=>{
      options=variantOptions($('variant').value);freshRun('variant-change');
      const url=new URL(location.href);url.search='';url.searchParams.set('variant',$('variant').value);history.replaceState(null,'',url);
      $('input').textContent='Variante gewechselt · neuer Run · Start erforderlich';sync();update();
    };
    for(const [id,label] of Object.entries({pelvis:'Becken',torso:'Oberkörper',head:'Kopf',upperArmL:'Oberarm links',upperArmR:'Oberarm rechts',lowerArmL:'Unterarm links',lowerArmR:'Unterarm rechts',handL:'Hand links',handR:'Hand rechts',upperLegL:'Oberschenkel links',upperLegR:'Oberschenkel rechts',lowerLegL:'Unterschenkel links',lowerLegR:'Unterschenkel rechts',footL:'Fuß links',footR:'Fuß rechts'})){
      if(!sim.rig.byId.has(id))continue;const option=document.createElement('option');option.value=id;option.textContent=label;$('body').append(option);
    }
    $('mark').onclick=()=>{
      const marker=feedback.mark(identity(),sim.steps,()=>sim.snapshot(),browserContext,()=>observePause('marker'));
      $('feedbackStatus').textContent='Markiert: Schritt '+marker.step+' · Run '+run+(marker.data_errors.length?' · Zustandsdaten teilweise nicht verfügbar':'');update();
    };
    $('feedbackExport').onclick=()=>{
      try{
        const result=feedback.report(identity(),{body_id:$('body').value||null,category:$('category').value,note:$('note').value},[...sim.rig.byId.keys()]);
        download(result.json,'goblin-playground-'+variantId(options)+'-run-'+run+'-step-'+feedback.marker.step+'.json');
        $('feedbackStatus').textContent=result.diagnostic?'Diagnosebericht heruntergeladen; fehlende Daten sind gekennzeichnet.':'Feedback als JSON heruntergeladen.';
      }catch(error){$('feedbackStatus').textContent=error.message;}
    };
  }
  function clearFeedback(){feedback.clear();if(playground){$('note').value='';$('body').value='';$('category').value='other';$('feedbackStatus').textContent='Noch keine Stelle markiert.';}}
  function identity(){return {build,variant:variantId(options),options:{...options},run_policy:session.runPolicy,run_id:sessionId+'-'+run};}
  function download(json,name){
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');
    try{a.href=url;a.download=name;document.body.append(a);a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
  for(const [id,strong] of [['small',false],['strong',true]])$(id).onclick=()=>{
    const ok=session.push(strong,$('schedule').checked);
    $('input').textContent=ok?((strong?'Starker':'Kleiner')+' Schubser'+($('schedule').checked?' bei 2 s vorgemerkt':'')):'Start erforderlich / Zeitpunkt 2 s bereits vorbei';update();
  };
  $('assistOff').onclick=()=>{sim.interrupt('manual-assist-off');session.event('assist-off');$('input').textContent='Hilfe bewusst ausgeschaltet · bleibt aus bis Reset';update();};
  function sync(){for(const {spec,body} of sim.rig.byId.values()){const m=meshes.get(spec.id);m.position.copy(body.translation());m.quaternion.copy(body.rotation());}block.visible=sim.obstacleEnabled;scene.updateMatrixWorld(true);}
  function project(point){const p=new THREE.Vector3(point.x,point.y,point.z).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}
  function update(){
    $('step').disabled=!session.paused||!!sim.invalid||sim.steps>=session.windowLimit||document.hidden;
    const reasons={hidden:'Seite verborgen',blur:'Fokus verloren',escape:'Escape',
      'manual-safety-stop':'manuell','pause-active-grab':'Pause bei aktivem Griff',
      'marker-active-grab':'Markierung bei aktivem Griff','timer-end-active-grab':'Timer bei aktivem Griff','window-limit':'Runfenster beendet',safety:'ungültiger Zustand'};
    $('pauseStatus').textContent=session.paused?(session.pauseContext.kind==='safety'?
      'Sicherheitsstopp · Hilfe aus · '+(reasons[session.pauseContext.reason]||session.pauseContext.reason):
      session.pauseContext.kind==='observation'?(session.pauseContext.reason==='timer-end'?'Timer erreicht · Zustand erhalten · Fortsetzen möglich':'Beobachtung pausiert · Zustand erhalten'):'Frischer Run · Start erforderlich'):
      'Simulation läuft · Pause erhält den Zustand';
    if(playground){
      for(const id of ['cameraMode','cameraReset','cameraFrame','cameraPerspective','cameraFront','side','cameraTop'])$(id).disabled=sim.grab.active;
      $('cameraViewStatus').textContent=sim.grab.active?'Ansicht gesperrt: zuerst den Körpergriff loslassen.':CAMERA_VIEWS[cameraViews.mode].label+' · '+(camera.isOrthographicCamera?'orthografisch':'perspektivisch');
      $('hint').textContent=cameraViews.navigation?(camera.isOrthographicCamera?'Kamera verschieben · zwei Finger zum Verschieben und Zoomen':'Kamera drehen · zwei Finger zum Verschieben und Zoomen'):'Körperteil anfassen und ziehen · Loslassen zum Werfen';
      for(const [id,mode] of Object.entries({cameraPerspective:'perspective',cameraFront:'front',side:'side',cameraTop:'top'}))$(id).setAttribute('aria-pressed',String(cameraViews.mode===mode));
      $('feedbackExport').disabled=!feedback.marker;
      const state={SETTLING:'Einpendeln',ASSISTED_READY:'Aufrecht mit Hilfe',DYNAMIC:'Freie Dynamik',DOWN:'Am Boden',STOPPED:'Sicherheitsstopp'};
      $('status').textContent=(session.paused?'Pausiert':'Läuft')+' · '+(state[sim.state]||sim.state)+' · Schritt '+sim.steps+' · '+(sim.steps/60).toFixed(2)+' s Simulationszeit · '+String(session.speed).replace('.',',')+'×';
      $('runOptions').textContent=session.runPolicy.timerSteps===null?'Freier Lauf · Timer aus':
        'Timer dieses Runs: '+session.runPolicy.timerSteps/60+' s Simulationszeit'+(session.timerReached?' · bereits erreicht':'');
      $('assistStatus').textContent='Hilfe '+(sim.enabled?'aktiv':'aus')+' · Ziel '+({NEUTRAL:'neutral',RISE:'Auslenkung',HOLD:'Halten',RETURN:'Rückkehr',OFF:'aus'}[sim.targetAssist().phase]||sim.targetAssist().phase);
      $('identity').textContent='Build '+build.build_id+' · Variante '+variantId(options)+' · Run '+run;
    }
    $('play').textContent=session.paused?(sim.steps>=session.windowLimit?'Fenster beendet':'Start / Fortsetzen'):'Pause';
    $('play').disabled=!!sim.invalid||sim.steps>=session.windowLimit||document.hidden;
    $('small').disabled=$('strong').disabled=session.paused||!!sim.invalid;
    if(!playground)$('status').textContent=(session.paused?'PAUSE · ':'')+sim.state+' · t='+(sim.steps/60).toFixed(2)+' s\nAssist '+(sim.enabled?'EIN':'AUS')+' · '+sim.reason+'\nUp '+sim.upAssist().phase+' · '+Math.round(sim.upAssist().factor*100)+' % · '+sim.yieldProfile+'\nZiel '+sim.targetAssist().id+' · '+sim.targetAssist().phase+' · '+(sim.targetAssist().angle*180/Math.PI).toFixed(2)+'° · gestaltete Gameplayhilfe'+(session.lastRun?'\nLetzter Physikstep: '+session.lastRun.final.state:'');
    const token=sim.lastHit?sim.lastHit.step+':'+sim.lastHit.strength:null;
    if(token!==null&&token!==lastHitToken){lastHitToken=token;$('input').textContent=(sim.lastHit.strength===3.2?'Starker':'Kleiner')+' Schubser ausgelöst · t='+(sim.lastHit.step/60).toFixed(2)+' s';}
    $('metrics').textContent='t '+(sim.steps/60).toFixed(2)+' s · Torso '+(sim.metrics.torsoTilt*180/Math.PI).toFixed(3)+'° · Motor-Cap '+sim.commands.motorCap+' Nm · Stützkraft '+sim.commands.support.toFixed(2)+' N · Bodies/Joints '+sim.world.bodies.len()+'/'+sim.world.impulseJoints.len();
  }
  const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const environment={userAgent:navigator.userAgent,platform:navigator.platform,dpr:devicePixelRatio,renderDpr:renderer.getPixelRatio(),
    backend:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webgl:gl.getParameter(gl.VERSION)};
  function cameraSnapshot(){return cameraViews?cameraViews.snapshot():{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,projection:camera.projectionMatrix.toArray(),view:camera.matrixWorldInverse.toArray()};}
  function browserContext(){return {environment,run_controls:{speed:session.speed,timerReached:session.timerReached},camera:cameraSnapshot(),viewport:{width:innerWidth,height:innerHeight,canvas:{width:canvas.clientWidth,height:canvas.clientHeight}}};}
  function report(){camera.updateMatrixWorld(true);return {build,environment,observationIdentity:{mass:sim.mass,dt:1/60,nativeTimestep:sim.world.timestep,config:sim.config,yieldProfile:sim.yieldProfile,reaction:sim.reaction,returnProfile:sim.returnProfile,returnSource:build.return_sha256,gravity:{...sim.world.gravity},sources:build.physics_sha256},
    observationCamera:{...cameraSnapshot(),canvas:{width:canvas.clientWidth,height:canvas.clientHeight}},viewport:{width:innerWidth,height:innerHeight,canvas:{width:canvas.clientWidth,height:canvas.clientHeight}},...session.report(),lastPhysicsState:session.trace.at(-1)?.state,frameIntervals:frameIntervals.slice(),stepCosts:stepCosts.slice()};}
  window.uprightDiagnostics=()=>({...report(),runIdentity:identity(),rendererMemory:{...renderer.info.memory},pointerId,parts:[...sim.rig.byId.values()].map(({spec,body})=>({id:spec.id,screen:project(body.translation())})),blockScreen:project({x:1.35,y:1,z:0})});
  window.uprightTrace=()=>({build,environment,...(session.lastRun||session.report())});
  window.uprightStepState=()=>({steps:sim.steps,paused:session.paused,invalid:sim.invalid});
  if(!playground)$('export').onclick=()=>download(JSON.stringify(report(),null,2),'goblin-step-trace.json');
  if(!playground)$('identity').textContent='Build '+build.revision.slice(0,12)+' · Controller '+build.controller_sha256.slice(0,12)+' · Return '+sim.returnProfile;
  for(const id of ['play','reset','assistOff','safetyStop',...(playground?['mark','variant']:['export'])])$(id).disabled=false;
  function suspend(){pause(document.hidden?'hidden':'blur');}
  addEventListener('blur',suspend);
  addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!ev.repeat){ev.preventDefault();pause('escape');}});
  document.addEventListener('visibilitychange',()=>{session.event('visibility',{hidden:document.hidden});if(document.hidden)suspend();else{session.clock.reset();update();}});
  let width=0,height=0;
  function render(ms){
    const w=view.clientWidth,h=view.clientHeight;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);if(cameraViews)cameraViews.resize(w,h);else{camera.aspect=w/h;camera.updateProjectionMatrix();}}
    if(!playground&&!session.paused&&lastFrame!==null)frameIntervals.push(ms-lastFrame);
    lastFrame=ms;
    const before=sim.steps,start=performance.now();session.tick(ms/1000);
    if(!playground&&sim.steps>before)stepCosts.push({steps:sim.steps-before,ms:performance.now()-start}); // Includes read-only observer cost.
    if(session.paused&&pointerId!==null)cancelPointer('window-end');
    sync();renderer.render(scene,camera);update();
  }
  sync();update();renderer.setAnimationLoop(render);
  let disposed=false;
  function dispose(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);cancelPointer('destroy');cameraViews?.dispose();session.dispose();for(const r of resources)r.dispose();renderer.dispose();}
  addEventListener('pagehide',dispose,{once:true});
}catch(error){console.error(error);$('status').textContent='Initialisierung fehlgeschlagen: '+error.message;}
