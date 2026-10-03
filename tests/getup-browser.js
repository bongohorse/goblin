import * as THREE from 'three';
import R from '@dimforge/rapier3d-compat';
import {fallenCase} from './getup-fixture.js';
import {ContactGetup} from '../src/contact-getup.js';
import {observeGetup} from '../src/getup-observation.js';
import {RIG_PARTS} from '../src/goblin-rig.js';
await R.init();
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();scene.background=new THREE.Color('#18232c');
const camera=new THREE.PerspectiveCamera(45,1,.05,50);camera.position.set(3,2.5,3);camera.lookAt(0,.65,-.45);
scene.add(new THREE.HemisphereLight(0xffffff,0x334455,2));
const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,2);scene.add(key);
const geometries=[],materials=[];
const material=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8});materials.push(m);return m;};
const mesh=(g,m)=>{geometries.push(g);const obj=new THREE.Mesh(g,m);scene.add(obj);return obj;};
const ground=mesh(new THREE.BoxGeometry(4,.04,4),material('#64776a'));ground.position.y=-.02;
const meshes=new Map(RIG_PARTS.map(p=>{
 const s=p.shape,g=s.type==='ball'?new THREE.SphereGeometry(s.radius,20,14):s.type==='capsule'?new THREE.CapsuleGeometry(s.radius,s.half*2,4,10):new THREE.BoxGeometry(s.half.x*2,s.half.y*2,s.half.z*2);
 return [p.id,mesh(g,material(p.id.startsWith('hand')?'#67d4ff':p.id.startsWith('foot')?'#ffb155':'#91ba71'))];
}));
const comMarker=mesh(new THREE.SphereGeometry(.035,10,6),material('#ff4040'));
const contactGeometry=new THREE.SphereGeometry(.025,8,6);geometries.push(contactGeometry);const contactMaterial=material('#46f8a0');
const markers=Array.from({length:40},()=>{const m=new THREE.Mesh(contactGeometry,contactMaterial);scene.add(m);return m;});
function line(color){const g=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(90),3));geometries.push(g);const m=new THREE.LineBasicMaterial({color});materials.push(m);const l=new THREE.LineLoop(g,m);scene.add(l);return l;}
const hull=line('#46f8a0'),feet=line('#ffb155');
let fixture,controller,running=false,steps=0,disposed=false,last=0,accumulator=0,frame;
const samples={controller:[],physics:[]};
function disposeFixture(){controller?.stop('teardown');fixture?.world.free();fixture=null;controller=null;}
function run(direction=-1){disposeFixture();fixture=fallenCase(R,direction);controller=new ContactGetup(R,fixture.world,fixture.rig,fixture.floor);running=false;steps=0;accumulator=0;samples.controller=[];samples.physics=[];draw();return status();}
function advance(n=1){for(let i=0;i<n;i++){
 for(const {body} of fixture.rig.byId.values())body.resetTorques(false);
 let t=performance.now();const active=!controller.disposed;controller.step(1/60);if(active)samples.controller.push(performance.now()-t);
 t=performance.now();fixture.world.step();if(active)samples.physics.push(performance.now()-t);steps++;
 }draw();return status();}
const stats=a=>({n:a.length,mean:a.reduce((n,v)=>n+v,0)/(a.length||1),p95:[...a].sort((a,b)=>a-b)[Math.floor(a.length*.95)]??0});
function status(){const s=observeGetup(fixture.world,fixture.rig,fixture.floor);return {time:steps/60,phase:controller.phase,disposed:controller.disposed,footStep:controller.footStep,com:s.com,footMargin:Number.isFinite(s.footMargin)?s.footMargin:null,footForce:s.footForce,weight:s.weight,upY:s.upY,standing:s.standing,contacts:s.contacts.map(({id,force})=>({id,force})),bodies:fixture.world.bodies.len(),joints:fixture.world.impulseJoints.len(),iterationValues:[...new Set([...fixture.rig.byId.values()].map(e=>e.body.additionalSolverIterations()))],cpuCallMs:{controllerWithDiagnostics:stats(samples.controller),worldStep:stats(samples.physics)},renderer:{...renderer.info.memory,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}};}
function polygon(line,points){const attribute=line.geometry.attributes.position;points.slice(0,30).forEach((p,i)=>attribute.setXYZ(i,p.x,.025,p.z));attribute.needsUpdate=true;line.geometry.setDrawRange(0,Math.min(points.length,30));}
function draw(){const s=observeGetup(fixture.world,fixture.rig,fixture.floor);
 for(const [id,{body}] of fixture.rig.byId){const m=meshes.get(id);m.position.copy(body.translation());m.quaternion.copy(body.rotation());}
 comMarker.position.copy(s.com);const points=s.contacts.filter(c=>c.force>.5).flatMap(c=>c.points);
 markers.forEach((m,i)=>{m.visible=i<points.length;if(m.visible)m.position.set(points[i].x,.025,points[i].z);});polygon(hull,s.hull);polygon(feet,s.footHull);
 camera.position.set(3,side?1.5:2.5,s.com.z+(side?0:3));camera.lookAt(0,.65,s.com.z);
 const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);
 const v=status();document.querySelector('#status').textContent=`t=${v.time.toFixed(2)} s | ${v.phase} | Fußstand=${v.standing} | Fußlast=${v.footForce.toFixed(1)} / ${v.weight.toFixed(1)} N | Fuß-COM-Rand=${v.footMargin?.toFixed(3)??'keine Fläche'} m\nRot: Schwerpunkt · Grün: belastete Kontakte / Hand-Fuß-Fläche · Orange: Füße / Fußfläche\n${JSON.stringify(v.footStep??{})}\nBodies=${v.bodies}, joints=${v.joints}, Iterationen=${v.iterationValues} (nach Abbruch 0)`;
}
function tick(now){if(disposed)return;if(running){accumulator+=Math.min(.1,(now-last)/1000);let n=0;while(accumulator>=1/60&&n<6){accumulator-=1/60;n++;}if(n)advance(n);}last=now;frame=requestAnimationFrame(tick);}
document.querySelector('#back').onclick=()=>run(-1);document.querySelector('#belly').onclick=()=>run(1);
document.querySelector('#play').onclick=()=>{running=!running;accumulator=0;};document.querySelector('#next').onclick=()=>{running=false;advance(30);};
let side=false;document.querySelector('#side').onclick=()=>{side=!side;camera.position.set(side?3:3,side?1.5:2.5,side?-.4:3);camera.lookAt(0,.65,-.45);draw();};
window.getupQA={run,advance,status,benchmark:(active,iterations)=>{
 const f=fallenCase(R,-1),c=active?new ContactGetup(R,f.world,f.rig,f.floor):null,physics=[],control=[];
 for(const {body} of f.rig.byId.values())body.setAdditionalSolverIterations(iterations);
 try{for(let i=0;i<120;i++){for(const {body} of f.rig.byId.values())body.resetTorques(false);let t=performance.now();c?.step(1/60);control.push(performance.now()-t);t=performance.now();f.world.step();physics.push(performance.now()-t);}
 return {active,iterations,phase:c?.phase??'passive',controllerMs:stats(control),worldStepMs:stats(physics),standing:observeGetup(f.world,f.rig,f.floor).standing};
 }finally{c?.stop('teardown');f.world.free();}
 },pause:()=>{running=false;},dispose:()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);disposeFixture();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();}};
addEventListener('pagehide',()=>window.getupQA.dispose(),{once:true});run();frame=requestAnimationFrame(tick);
