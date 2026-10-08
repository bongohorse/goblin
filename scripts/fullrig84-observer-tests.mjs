// Stored/pure regressions: zero new Rapier worlds/steps.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {floorObservation} from '../src/labs/standing/measurement.js';
import {checkFloorState} from './fullrig84-floor-reader.mjs';
const root='docs/research/standing-lab/fullrig84/observer-v3/';
const state=JSON.parse(fs.readFileSync(root+'cached-witness.json')),floorSpec=state.settings.floor;
const copy=x=>structuredClone(x),collider=b=>({shapeType:()=>b.native_shape_type,rotation:()=>copy(b.collider_rotation),translation:()=>copy(b.collider_position),halfExtents:()=>copy(b.observed_shape.half),halfHeight:()=>b.observed_shape.half,radius:()=>b.observed_shape.radius,contactCollider:()=>null});
const floor={rotation:()=>copy(floorSpec.rotation),translation:()=>copy(floorSpec.position),halfExtents:()=>copy(floorSpec.half)};
const entries=state.bodies.map(b=>({spec:{id:b.id},collider:collider(b)}));
const world={timestep:state.settings.dt,contactPair:(_f,c,fn)=>{const id=entries.find(e=>e.collider===c).spec.id;for(const m of state.floor_manifolds.filter(m=>m.body_id===id))fn({normal:()=>copy(m.normal),numContacts:()=>m.contacts.length,contactDist:i=>m.contacts[i].distance,localContactPoint1:i=>copy(m.contacts[i].local1),localContactPoint2:i=>copy(m.contacts[i].local2),contactImpulse:i=>m.contacts[i].impulse,numSolverContacts:()=>0},m.flipped);}};
state.floor_observation=floorObservation(world,floor,entries);state.floor_contacts=state.floor_observation.contacts;checkFloorState(state);
for(const id of ['footL','footR']){const r=state.floor_observation.bodies.find(b=>b.body_id===id);assert.equal(r.current_touching,true);assert.ok(r.candidates.every(c=>c.cached_distance>0));assert.ok(r.interval_vertical_mean_load>40);}
for(const mutate of [s=>s.floor_observation.bodies.find(b=>b.body_id==='footL').interval_vertical_mean_load=0,s=>s.floor_observation.bodies.find(b=>b.body_id==='footL').current_touching=false,s=>s.floor_observation.bodies.find(b=>b.body_id==='footL').candidates[0].current_anchor_gap+=.01]){const bad=copy(state);mutate(bad);assert.throws(()=>checkFloorState(bad));}
// Positive interval impulse with separated current geometry must not imply touching.
const detached=copy(state);for(const b of detached.bodies)b.collider_position.y+=2;
const de=detached.bodies.map(b=>({spec:{id:b.id},collider:collider(b)}));
const dw={...world,contactPair:(_f,c,fn)=>{const index=de.findIndex(e=>e.collider===c);world.contactPair(floor,entries[index].collider,fn);}};
detached.floor_observation=floorObservation(dw,floor,de);detached.floor_contacts=detached.floor_observation.contacts;checkFloorState(detached);assert.equal(detached.floor_contacts.length,0);assert.ok(detached.floor_observation.bodies.some(b=>b.interval_normal_impulse>0));
for(const name of ['issue84-observer-v3-controls-4/drop-rest-release','issue84-observer-v3-controls-5/reverse-offset-drop-rest-release']){const r=JSON.parse(fs.readFileSync(root+'diagnostics/'+name+'.json'));assert.equal(r.rows.length,244);assert.ok(r.rows.some(x=>x.phase==='release'&&!x.observation.bodies[0].current_touching&&x.observation.bodies[0].candidates.length));assert.ok(Math.abs(r.rows.slice(180,240).reduce((s,x)=>s+x.observation.bodies[0].interval_vertical_mean_load,0)/60-9.81)<.02);}
console.log(JSON.stringify({stored_cached_witness:36,positive_impulse_detached:true,real_cached_release_controls:2,corruptions_rejected:3,new_worlds:0,new_steps:0}));
