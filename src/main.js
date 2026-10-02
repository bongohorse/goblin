import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

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
camera.position.set(0,3.1,8.2);
camera.lookAt(0,1.5,0);

scene.add(new THREE.HemisphereLight(0xffddb4,0x21110d,1.4));
const key = new THREE.DirectionalLight(0xffd0a0,3.2);
key.position.set(4,8,6); key.castShadow=true; key.shadow.mapSize.set(2048,2048); scene.add(key);
const fire = new THREE.PointLight(0xff6a19,25,9,2); fire.position.set(-4,2.7,-2); scene.add(fire);
const fire2 = new THREE.PointLight(0xff8b2f,18,8,2); fire2.position.set(4,3,-3); scene.add(fire2);

const world = new RAPIER.World({x:0,y:-9.81,z:0});
world.timestep = 1/60;

const rbToMesh = new Map();
const meshToBody = new WeakMap();
const goblinBodies = new Map();
const hitParts = new Set();
let thrownCount=0, fallen=false, running=false, score=0, combo=1, time=60, selectedTool="hand";
let grabbed=null, pointerDown=false, accumulator=0, prev=performance.now()/1000;
let camMode=0;
let goblinBelt=null;

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
  const b=world.createRigidBody(desc); world.createCollider(collider,b); bodyMesh(id,b,mesh); return b;
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

function addGoblin(){
  // Physics-first segmented ragdoll. The meshes can later be replaced by a rigged GLTF adapter.
  const parts={};
  const makeCaps=(id,pos,half,radius,material=green)=>{
    const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,half*2,7,12),material);
    const b=dynamic(RAPIER.RigidBodyDesc.dynamic().setTranslation(...pos).setLinearDamping(.35).setAngularDamping(1.0),
      RAPIER.ColliderDesc.capsule(half,radius).setDensity(id.includes("Leg")?1.3:1.0).setFriction(.9).setRestitution(.03),mesh,id);
    parts[id]=b; return b;
  };
  const pelvis=makeCaps("pelvis",[0,1.4,0],.13,.23,cloth);
  const torso=makeCaps("torso",[0,1.82,0],.24,.28,cloth);
  const headMesh=new THREE.Mesh(new THREE.SphereGeometry(.43,24,18),green2);
  const head=dynamic(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,2.45,0).setLinearDamping(.35).setAngularDamping(1),
    RAPIER.ColliderDesc.ball(.43).setDensity(.9).setFriction(.7),headMesh,"head"); parts.head=head;

  // Eyes + nose + ears are child visuals of the head mesh.
  for(const sx of [-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.095,16,12),white); eye.position.set(.16*sx,.1,.38); headMesh.add(eye);
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(.045,12,10),dark); pupil.position.set(.02*sx,0,.085); eye.add(pupil);
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.19,.48,14),green2); ear.rotation.z=sx*Math.PI/2; ear.position.set(.48*sx,.05,0); headMesh.add(ear);
  }
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.09,14,10),pink); nose.position.set(0,-.02,.42); headMesh.add(nose);

  const uAL=makeCaps("upperArmL",[-.43,1.92,0],.18,.105), lAL=makeCaps("lowerArmL",[-.78,1.83,0],.18,.09);
  const uAR=makeCaps("upperArmR",[.43,1.92,0],.18,.105), lAR=makeCaps("lowerArmR",[.78,1.83,0],.18,.09);
  const uLL=makeCaps("upperLegL",[-.2,1.03,0],.21,.13), lLL=makeCaps("lowerLegL",[-.2,.57,0],.21,.115);
  const uLR=makeCaps("upperLegR", [.2,1.03,0],.21,.13), lLR=makeCaps("lowerLegR",[.2,.57,0],.21,.115);

  const joint=(a,b,anchorA,anchorB,type="spherical",axis={x:0,y:0,z:1},limits=null)=>{
    let data= type==="revolute" ? RAPIER.JointData.revolute(anchorA,anchorB,axis) : RAPIER.JointData.spherical(anchorA,anchorB);
    const j=world.createImpulseJoint(data,a,b,true); j.setContactsEnabled(false);
    if(limits && j.setLimits) j.setLimits(limits[0],limits[1]); return j;
  };
  joint(pelvis,torso,{x:0,y:.2,z:0},{x:0,y:-.28,z:0},"revolute",{x:0,y:0,z:1},[-.45,.45]);
  joint(torso,head,{x:0,y:.34,z:0},{x:0,y:-.42,z:0},"revolute",{x:0,y:0,z:1},[-.6,.6]);
  joint(torso,uAL,{x:-.26,y:.18,z:0},{x:0,y:.2,z:0}); joint(uAL,lAL,{x:0,y:-.2,z:0},{x:0,y:.2,z:0},"revolute",{x:0,y:0,z:1},[-2.2,.2]);
  joint(torso,uAR,{x:.26,y:.18,z:0},{x:0,y:.2,z:0});  joint(uAR,lAR,{x:0,y:-.2,z:0},{x:0,y:.2,z:0},"revolute",{x:0,y:0,z:1},[-.2,2.2]);
  joint(pelvis,uLL,{x:-.15,y:-.13,z:0},{x:0,y:.23,z:0}); joint(uLL,lLL,{x:0,y:-.23,z:0},{x:0,y:.23,z:0},"revolute",{x:0,y:0,z:1},[-.1,2.4]);
  joint(pelvis,uLR,{x:.15,y:-.13,z:0},{x:0,y:.23,z:0});  joint(uLR,lLR,{x:0,y:-.23,z:0},{x:0,y:.23,z:0},"revolute",{x:0,y:0,z:1},[-2.4,.1]);

  // Rope belt visual.
  const belt=new THREE.Mesh(new THREE.TorusGeometry(.27,.035,8,20),mat(0x7f5a34,1));
  belt.rotation.x=Math.PI/2;
  belt.castShadow=true;
  goblinBelt=belt;
  scene.add(goblinBelt);
}
addGoblin();

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
  const t=goblinBodies.get("torso");
  if(t && goblinBelt){
    const p=t.translation(),q=t.rotation();
    goblinBelt.position.set(p.x,p.y,p.z);
    goblinBelt.quaternion.set(q.x,q.y,q.z,q.w);
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
  for(const [id,b] of goblinBodies) if(b.handle===body.handle) return id; return null;
}
function addScore(n, part=null){
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
  thrownCount++; if(thrownCount>=3) document.querySelector("#goalThrows").checked=true; addScore(20);
}
function bonk(power){
  try{
    const ctx=bonk.ctx||(bonk.ctx=new AudioContext()); const o=ctx.createOscillator(),g=ctx.createGain();
    o.type="triangle";o.frequency.value=170+power*12;g.gain.setValueAtTime(.09,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09);
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.1);
  }catch{}
}

renderer.domElement.addEventListener("pointerdown",ev=>{
  if(!running)return; pointerDown=true; renderer.domElement.setPointerCapture(ev.pointerId);
  const r=getHit(ev); if(!r)return;
  const p=bodyPart(r.body);
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
  const r=renderer.domElement.getBoundingClientRect(); pointer.x=((ev.clientX-r.left)/r.width)*2-1; pointer.y=-((ev.clientY-r.top)/r.height)*2+1;
  if(grabbed){ raycaster.setFromCamera(pointer,camera); raycaster.ray.intersectPlane(dragPlane,dragPoint); }
});
renderer.domElement.addEventListener("pointerup",()=>{pointerDown=false;grabbed=null;});

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
  if(!fallen && (h.y<.72||t.y<.65)){fallen=true;document.querySelector("#goalFall").checked=true;addScore(180);}
}
function resetGoblin(){
  const starts={
    pelvis:[0,1.4,0],torso:[0,1.82,0],head:[0,2.45,0],
    upperArmL:[-.43,1.92,0],lowerArmL:[-.78,1.83,0],upperArmR:[.43,1.92,0],lowerArmR:[.78,1.83,0],
    upperLegL:[-.2,1.03,0],lowerLegL:[-.2,.57,0],upperLegR:[.2,1.03,0],lowerLegR:[.2,.57,0]
  };
  for(const [id,b] of goblinBodies){const p=starts[id];b.setTranslation({x:p[0],y:p[1],z:p[2]},true);b.setRotation({x:0,y:0,z:0,w:1},true);b.setLinvel({x:0,y:0,z:0},true);b.setAngvel({x:0,y:0,z:0},true);}
  fallen=false;
}
document.querySelectorAll("#toolbar button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#toolbar button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedTool=b.dataset.tool;});
document.querySelector("#resetBtn").onclick=resetGoblin;
document.querySelector("#cameraBtn").onclick=()=>{camMode=(camMode+1)%3};
document.querySelector("#helpBtn").onclick=()=>document.querySelector("#help").classList.add("active");
document.querySelector("#closeHelp").onclick=()=>document.querySelector("#help").classList.remove("active");

function startGame(){
  score=0;combo=1;time=60;hitParts.clear();thrownCount=0;fallen=false;running=true;
  ["goalFall","goalParts","goalThrows"].forEach(id=>document.querySelector("#"+id).checked=false);
  document.querySelector("#score").textContent=0;document.querySelector("#combo").textContent=1;document.querySelector("#time").textContent=60;
  resetGoblin(); document.querySelector("#startScreen").classList.remove("active"); document.querySelector("#endScreen").classList.remove("active");
}
document.querySelector("#startBtn").onclick=startGame;document.querySelector("#againBtn").onclick=startGame;

setInterval(()=>{
  if(!running)return; time--; document.querySelector("#time").textContent=time;
  if(time<=0){running=false;document.querySelector("#finalScore").textContent=score;const goals=[...document.querySelectorAll("#objectives input")].filter(x=>x.checked).length;document.querySelector("#finalText").textContent=`${goals}/3 Ziele erfüllt · ${hitParts.size} unterschiedliche Körperteile getroffen`;document.querySelector("#endScreen").classList.add("active");}
},1000);

function animate(nowMs){
  requestAnimationFrame(animate);
  const now=nowMs/1000; let dt=Math.min(.05,now-prev); prev=now; accumulator+=dt;
  while(accumulator>=1/60){continuousTools();world.step();checkGoals();accumulator-=1/60;}
  syncMeshes();
  const target=goblinBodies.get("torso").translation();
  if(camMode===0){camera.position.lerp(new THREE.Vector3(0,3.1,8.2),.04);}
  else if(camMode===1){camera.position.lerp(new THREE.Vector3(6,3.6,5.5),.04);}
  else{camera.position.lerp(new THREE.Vector3(-5,2.8,4.8),.04);}
  camera.lookAt(target.x,target.y+.15,target.z);
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
