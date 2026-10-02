import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { FixedClock, RoundLifecycle, FallTracker } from "./runtime.js";
import {createGoblinRig} from './goblin-rig.js';
import {createRigDebug} from './rig-debug.js';

await RAPIER.init();

const root = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120b08);
scene.fog = new THREE.Fog(0x120b08,12,28);

const camera = new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.05,80);
camera.position.set(0,3.1,6.4);
camera.lookAt(0,1.5,0);

scene.add(new THREE.HemisphereLight(0xffddb4,0x21110d,1.4));
const key = new THREE.DirectionalLight(0xffd0a0,3.2);
key.position.set(4,8,6); key.castShadow=true; key.shadow.mapSize.set(1024,1024); scene.add(key);
const fire = new THREE.PointLight(0xff6a19,25,9,2); fire.position.set(-4,2.7,-2); scene.add(fire);
const fire2 = new THREE.PointLight(0xff8b2f,18,8,2); fire2.position.set(4,3,-3); scene.add(fire2);

const world = new RAPIER.World({x:0,y:-9.81,z:0});
world.timestep = 1/60;

const rbToMesh = new Map();
const meshToBody = new WeakMap();
const goblinBodies = new Map();
const initialStates = new Map();
const projectiles = new Set();
const MAX_PROJECTILES = 24;
const clock = new FixedClock();
const round = new RoundLifecycle();
const falls = new FallTracker();
const hitParts = new Set();
let thrownCount=0, score=0, combo=1, time=60, selectedTool="hand";
let grabbed=null, pointerDown=false, activePointer=null;
let camMode=0;
let frameMs=0, physicsMs=0, physicsSteps=0;

const mat = (c,rough=.75)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:.05});
const green=mat(0x78b82f,.7), green2=mat(0x91cb42,.7), cloth=mat(0x8f6338,1), wood=mat(0x75411f,1), metal=mat(0x66666a,.35);
const white=mat(0xe8e2d2,.7), dark=mat(0x2b2118,.85), pink=mat(0xe27763,.7);

function bodyMesh(id, body, mesh){
  scene.add(mesh); mesh.castShadow=mesh.receiveShadow=true;
  rbToMesh.set(body.handle,mesh); meshToBody.set(mesh,body);
  if(id) goblinBodies.set(id,body);
  return body;
}
function dynamic(desc, collider, mesh, id=null){
  const b=world.createRigidBody(desc); world.createCollider(collider,b); bodyMesh(id,b,mesh);
  initialStates.set(b.handle,{position:{...b.translation()},rotation:{...b.rotation()}});
  return b;
}
function fixedBox(pos,size,color=0x56351f){
  const b=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...pos));
  world.createCollider(RAPIER.ColliderDesc.cuboid(size[0]/2,size[1]/2,size[2]/2).setFriction(.9),b);
  const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color,1)); m.position.set(...pos); m.receiveShadow=true; scene.add(m);
}
fixedBox([0,-.2,0],[12,.4,12],0x4a2b19);
fixedBox([0,3.2,-5.5],[12,6,.4],0x3c2418);
fixedBox([-5.8,3,0],[.4,6,12],0x422719);
fixedBox([5.8,3,0],[.4,6,12],0x422719);

for(let x=-5;x<=5;x+=2){
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.22,5.5,.22),wood); beam.position.set(x,2.55,-5.2); beam.castShadow=true; scene.add(beam);
}
for(let i=0;i<7;i++){
  const g=new THREE.Mesh(new THREE.BoxGeometry(1.3,.12,8),mat(i%2?0x5f381f:0x704126,1));
  g.position.set(-4.2+i*1.4,.02,0); g.receiveShadow=true; scene.add(g);
}

function propBox(x,y,z,s=0.7){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(s,s,s),wood);
  const b=dynamic(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setAngularDamping(.25),
    RAPIER.ColliderDesc.cuboid(s/2,s/2,s/2).setDensity(1.1).setFriction(.8),mesh);
  return b;
}
function propBarrel(x,y,z){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.9,16),wood);
  const b=dynamic(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setAngularDamping(.2),
    RAPIER.ColliderDesc.cylinder(.45,.42).setDensity(1.2).setFriction(.8),mesh);
  return b;
}
[[-3,.5,-1],[3,.5,-2],[-4,.5,2],[4,.5,1]].forEach(p=>propBox(...p));
[[-2,.5,-3],[2,.5,-3],[4,.5,3]].forEach(p=>propBarrel(...p));

const rig=createGoblinRig(RAPIER,world);
const debugEnabled=new URLSearchParams(location.search).has('debug');
const rigDebug=debugEnabled?createRigDebug(scene,world,rig):null;
let contactsValid=false;
for(const {spec,body} of rig.byId.values()){
  const s=spec.shape;
  const geometry=s.type==='ball'?new THREE.SphereGeometry(s.radius,spec.id==='head'?24:12,spec.id==='head'?18:8):s.type==='capsule'?new THREE.CapsuleGeometry(s.radius,s.half*2,7,12):new THREE.BoxGeometry(s.half.x*2,s.half.y*2,s.half.z*2);
  const mesh=new THREE.Mesh(geometry,['pelvis','torso'].includes(spec.id)?cloth:spec.id==='head'?green2:green);
  mesh.userData.partId=spec.id;
  bodyMesh(spec.id,body,mesh);
}
const headMesh=rbToMesh.get(goblinBodies.get('head').handle);
for(const sx of [-1,1]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.095,16,12),white);eye.position.set(.17*sx,.10,.43);headMesh.add(eye);
  const pupil=new THREE.Mesh(new THREE.SphereGeometry(.045,12,10),dark);pupil.position.set(.02*sx,0,.085);eye.add(pupil);
  const ear=new THREE.Mesh(new THREE.ConeGeometry(.19,.48,14),green2);ear.rotation.z=sx*Math.PI/2;ear.position.set(.53*sx,.05,0);headMesh.add(ear);
}
const nose=new THREE.Mesh(new THREE.SphereGeometry(.09,14,10),pink);nose.position.set(0,-.02,.47);headMesh.add(nose);
// Cosmetic children inherit the authoritative body transform once.
const belt=new THREE.Mesh(new THREE.TorusGeometry(.245,.035,8,20),mat(0x7f5a34,1));belt.rotation.x=Math.PI/2;belt.castShadow=true;
rbToMesh.get(goblinBodies.get('torso').handle).add(belt);

const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const dragPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
const dragPoint=new THREE.Vector3();

function syncMeshes(){
  for(const [h,m] of rbToMesh){
    const b=world.getRigidBody(h); if(!b) continue;
    const p=b.translation(), q=b.rotation();
    m.position.set(p.x,p.y,p.z); m.quaternion.set(q.x,q.y,q.z,q.w);
  }
}
function getHit(ev){
  const r=renderer.domElement.getBoundingClientRect();
  pointer.x=((ev.clientX-r.left)/r.width)*2-1; pointer.y=-((ev.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects([...rbToMesh.values()],true);
  for(const hit of hits){
    let o=hit.object; while(o && !meshToBody.has(o)) o=o.parent;
    if(o){ const body=meshToBody.get(o); return {hit,body,mesh:o}; }
  }
  return null;
}
function bodyPart(body){
  return rig.byBody.get(body.handle)?.spec.id ?? null;
}
function addScore(n, part=null){
  if(!round.canScore)return;
  score+=Math.round(n*combo); if(part){hitParts.add(part); combo=Math.min(9,1+Math.floor(hitParts.size/2));}
  document.querySelector("#score").textContent=score; document.querySelector("#combo").textContent=combo;
  if(hitParts.size>=3) document.querySelector("#goalParts").checked=true;
}
function impulseTool(body,hit,strength){
  const dir=new THREE.Vector3().subVectors(hit.point,camera.position).normalize().multiplyScalar(strength);
  body.applyImpulseAtPoint({x:dir.x,y:Math.max(.25,dir.y),z:dir.z},{x:hit.point.x,y:hit.point.y,z:hit.point.z},true);
  const p=bodyPart(body); addScore(35+strength*5,p); bonk(strength);
}
function projectile(kind,target){
  if(projectiles.size>=MAX_PROJECTILES)removeProjectile(projectiles.values().next().value);
  const dir=target.clone().sub(camera.position).normalize();
  const start=camera.position.clone().add(dir.clone().multiplyScalar(1.2));
  let mesh, col, density=1.2, speed=9;
  if(kind==="ball"||kind==="rock"||kind==="bowling"||kind==="fish"){
    const rad=kind==="bowling"?.22:kind==="rock"?.18:.16;
    mesh=new THREE.Mesh(new THREE.SphereGeometry(rad,16,12),kind==="fish"?mat(0x4eb6d8):kind==="ball"?mat(0xd12d36):mat(0x505054));
    col=RAPIER.ColliderDesc.ball(rad); density=kind==="bowling"?4:1.4; speed=kind==="bowling"?7:10;
  }else if(kind==="crate"){
    mesh=new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.42),wood); col=RAPIER.ColliderDesc.cuboid(.21,.21,.21); density=2;
  }else{
    mesh=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.5,14),wood); col=RAPIER.ColliderDesc.cylinder(.25,.25); density=2.1; speed=8;
  }
  const b=dynamic(RAPIER.RigidBodyDesc.dynamic().setTranslation(start.x,start.y,start.z).setLinvel(dir.x*speed,dir.y*speed,dir.z*speed).setAngvel(3,2,1),
    col.setDensity(density).setRestitution(.2).setFriction(.7),mesh);
  projectiles.add(b.handle);
  thrownCount++; if(thrownCount>=3) document.querySelector("#goalThrows").checked=true; addScore(20);
}
function bonk(power){
  try{
    const ctx=bonk.ctx||(bonk.ctx=new AudioContext()); ctx.resume().catch(()=>{}); const o=ctx.createOscillator(),g=ctx.createGain();
    o.type="triangle";o.frequency.value=170+power*12;g.gain.setValueAtTime(.09,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09);
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.1);
  }catch{}
}

renderer.domElement.addEventListener("pointerdown",ev=>{
  if(!round.canInteract || activePointer!==null || !ev.isPrimary || ev.button!==0)return;
  const r=getHit(ev); if(!r)return;
  const wasReady=round.phase==="ready";
  round.beginAction();
  if(wasReady)clock.reset();
  document.querySelector("#hint").textContent="Tool wählen und den Goblin oder die Arena anklicken.";
  pointerDown=true; activePointer=ev.pointerId; renderer.domElement.setPointerCapture(ev.pointerId);
  const p=bodyPart(r.body);
  if((p && !["rock","ball","bowling","crate","barrel","fish"].includes(selectedTool)) || ["fan","magnet","spring"].includes(selectedTool))falls.markAction();
  if(selectedTool==="hand"){ grabbed=r.body; dragPlane.constant=-r.hit.point.z; dragPoint.copy(r.hit.point); if(p)addScore(5,p); }
  else if(selectedTool==="glove") impulseTool(r.body,r.hit,3.2);
  else if(selectedTool==="hammer") impulseTool(r.body,r.hit,6.2);
  else if(selectedTool==="plunger"){ const d=camera.position.clone().sub(r.hit.point).normalize().multiplyScalar(4.5); r.body.applyImpulse({x:d.x,y:d.y,z:d.z},true); addScore(45,p); }
  else if(selectedTool==="broom"){ const d=new THREE.Vector3(4*(r.hit.point.x>0?-1:1),.25,0); r.body.applyImpulse({x:d.x,y:d.y,z:d.z},true); addScore(40,p); }
  else if(selectedTool==="spring"){ const b=goblinBodies.get("pelvis"); b.applyImpulse({x:0,y:7,z:0},true); addScore(30,"pelvis"); }
  else if(["rock","ball","bowling","crate","barrel","fish"].includes(selectedTool)) projectile(selectedTool,r.hit.point);
  else if(selectedTool==="ice"){ r.body.applyImpulse({x:(Math.random()-.5)*6,y:.2,z:(Math.random()-.5)*2},true); addScore(30,p); }
});
renderer.domElement.addEventListener("pointermove",ev=>{
  if(activePointer!==null && ev.pointerId!==activePointer)return;
  const r=renderer.domElement.getBoundingClientRect(); pointer.x=((ev.clientX-r.left)/r.width)*2-1; pointer.y=-((ev.clientY-r.top)/r.height)*2+1;
  if(grabbed){ raycaster.setFromCamera(pointer,camera); raycaster.ray.intersectPlane(dragPlane,dragPoint); }
});
function clearToolForces(){
  for(const handle of rbToMesh.keys()){
    const body=world.getRigidBody(handle);
    if(body){body.resetForces(false);body.resetTorques(false);}
  }
}
function cancelInteraction(){
  const pointerId=activePointer;
  activePointer=null; pointerDown=false; grabbed=null;
  clearToolForces();
  if(pointerId!==null && renderer.domElement.hasPointerCapture(pointerId))renderer.domElement.releasePointerCapture(pointerId);
}
for(const type of ["pointerup","pointercancel","lostpointercapture"]){
  renderer.domElement.addEventListener(type,ev=>{if(ev.pointerId===activePointer)cancelInteraction();});
}
function suspend(){round.paused=true;cancelInteraction();clock.reset();bonk.ctx?.suspend().catch(()=>{});}
function resume(){
  if(document.hidden || document.querySelector("#help").classList.contains("active"))return;
  round.paused=false;clock.reset();
}
addEventListener("blur",suspend);
addEventListener("focus",resume);
document.addEventListener("visibilitychange",()=>document.hidden?suspend():resume());

function continuousTools(){
  if(grabbed){
    const p=grabbed.translation(),cur=new THREE.Vector3(p.x,p.y,p.z),f=dragPoint.clone().sub(cur).multiplyScalar(55);
    if(f.length()>180)f.setLength(180); grabbed.addForce({x:f.x,y:f.y,z:f.z},true);
  }
  if(pointerDown && (selectedTool==="fan"||selectedTool==="magnet")){
    raycaster.setFromCamera(pointer,camera);
    for(const body of goblinBodies.values()){
      const p=body.translation(),v=new THREE.Vector3(p.x,p.y,p.z);
      let f;
      if(selectedTool==="fan") f=new THREE.Vector3().subVectors(v,camera.position).normalize().multiplyScalar(22);
      else f=camera.position.clone().sub(v).normalize().multiplyScalar(17);
      body.addForce({x:f.x,y:f.y,z:f.z},true);
    }
  }
}
function checkGoals(){
  const h=goblinBodies.get("head").translation(), t=goblinBodies.get("torso").translation();
  const isFallen=h.y<.72||t.y<.65;
  if(falls.observe(isFallen,round.canScore)){document.querySelector("#goalFall").checked=true;addScore(180);}
}
function removeProjectile(handle){
  const mesh=rbToMesh.get(handle),body=world.getRigidBody(handle);
  if(grabbed?.handle===handle)cancelInteraction();
  if(body)world.removeRigidBody(body);
  if(mesh){
    meshToBody.delete(mesh); scene.remove(mesh); mesh.geometry.dispose();
    if(mesh.material!==wood)mesh.material.dispose();
  }
  rbToMesh.delete(handle);initialStates.delete(handle);projectiles.delete(handle);
}
function resetGoblin(ready=round.phase!=="preparing"){
  contactsValid=false;
  cancelInteraction();
  for(const handle of [...projectiles])removeProjectile(handle);
  rig.reset();
  for(const [handle,state] of initialStates){
    const body=world.getRigidBody(handle); if(!body)continue;
    body.setTranslation(state.position,true);body.setRotation(state.rotation,true);
    body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
    body.resetForces(false);body.resetTorques(false);
  }
  score=0;combo=1;time=60;hitParts.clear();thrownCount=0;falls.reset();
  round.reset(ready);
  round.paused=document.hidden || document.querySelector("#help").classList.contains("active");
  clock.reset();
  ["goalFall","goalParts","goalThrows"].forEach(id=>document.querySelector("#"+id).checked=false);
  document.querySelector("#score").textContent=0;document.querySelector("#combo").textContent=1;document.querySelector("#time").textContent=60;
  document.querySelector("#endScreen").classList.remove("active");
  document.querySelector("#hint").textContent="Bereit · Die erste Aktion startet die Runde.";
  syncMeshes();
}
document.querySelectorAll("#toolbar button").forEach(b=>b.onclick=()=>{cancelInteraction();document.querySelectorAll("#toolbar button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedTool=b.dataset.tool;});
document.querySelector("#resetBtn").onclick=()=>resetGoblin();
document.querySelector("#cameraBtn").onclick=()=>{cancelInteraction();camMode=(camMode+1)%3};
document.querySelector("#helpBtn").onclick=()=>{document.querySelector("#help").classList.add("active");suspend();};
document.querySelector("#closeHelp").onclick=()=>{document.querySelector("#help").classList.remove("active");resume();};

function startGame(){
  document.querySelector("#startScreen").classList.remove("active");
  resetGoblin(true);
}
document.querySelector("#startBtn").onclick=startGame;document.querySelector("#againBtn").onclick=startGame;

function endRound(){
  cancelInteraction();
  document.querySelector("#finalScore").textContent=score;
  const goals=[...document.querySelectorAll("#objectives input")].filter(x=>x.checked).length;
  document.querySelector("#finalText").textContent=`${goals}/3 Ziele erfüllt · ${hitParts.size} unterschiedliche Körperteile getroffen`;
  document.querySelector("#endScreen").classList.add("active");
}

function animate(nowMs){
  requestAnimationFrame(animate);
  const frameStart=performance.now();
  physicsSteps=clock.advance(nowMs/1000,round.paused || round.phase==="preparing" || round.phase==="ended",()=>{
    clearToolForces();continuousTools();world.step();contactsValid=true;checkGoals();
  });
  if(round.advance(clock.elapsed))endRound();
  physicsMs=performance.now()-frameStart;
  const displayTime=Math.ceil(round.remaining);
  if(displayTime!==time){time=displayTime;document.querySelector("#time").textContent=time;}
  syncMeshes();
  rigDebug?.update(contactsValid);
  const target=goblinBodies.get("torso").translation();
  if(camMode===0){camera.position.lerp(new THREE.Vector3(0,3.1,6.4),.04);}
  else if(camMode===1){camera.position.lerp(new THREE.Vector3(6,3.6,5.5),.04);}
  else{camera.position.lerp(new THREE.Vector3(-5,2.8,4.8),.04);}
  camera.lookAt(target.x,target.y+.15,target.z);
  renderer.render(scene,camera);
  frameMs=performance.now()-frameStart;
}
requestAnimationFrame(animate);
function resize(){
  const width=Math.max(1,root.clientWidth),height=Math.max(1,root.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<900?1.5:2));
  renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
  cancelInteraction();
}
addEventListener("resize",resize);
visualViewport?.addEventListener("resize",resize);
resize();syncMeshes();

// Opt-in read-only diagnostics for repeatable QA; never drives gameplay.
if(debugEnabled){
  window.goblinDiagnostics=()=>({
    phase:round.phase,paused:round.paused,score,time,grabbed:grabbed!==null,pointerDown,
    bodies:world.bodies.len(),joints:world.impulseJoints.len(),projectiles:projectiles.size,
    geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,
    drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
    frameMs,physicsMs,physicsSteps,dpr:renderer.getPixelRatio(),
    rigDebug:rigDebug.state,hitParts:[...hitParts],
    parts:[...goblinBodies].map(([id,body])=>{
      const p=body.translation(),v=new THREE.Vector3(p.x,p.y,p.z).project(camera);
      const rect=renderer.domElement.getBoundingClientRect();
      const entry=rig.byId.get(id),mesh=rbToMesh.get(body.handle);
      return {id,bone:entry.spec.bone,body:body.handle,collider:entry.collider.handle,joints:entry.joints,
        mass:body.mass(),position:{...p},rotation:{...body.rotation()},velocity:{...body.linvel()},sleeping:body.isSleeping(),
        meshError:mesh.position.distanceTo(new THREE.Vector3(p.x,p.y,p.z)),
        meshRotationError:mesh.quaternion.clone().normalize().angleTo(new THREE.Quaternion(body.rotation().x,body.rotation().y,body.rotation().z,body.rotation().w).normalize()),
        screen:{x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2}};
    })
  });
}
