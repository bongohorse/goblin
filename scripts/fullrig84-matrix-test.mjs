// Real installed Rapier matrix class; no engine init, worlds or public steps.
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {inverseInertiaComponents} from './fullrig84-world.mjs';
const buffer=new Float32Array([4,.25,-.5,5,.75,6,999,NaN,Infinity,-999,8,9,10,11,12,13]);
const m=R.SdpMatrix3Ops.fromBuffer(buffer);
assert.equal(m.elements.length,16);
assert.equal(m.elements,buffer);
assert.deepEqual([m.m21,m.m31,m.m32],[.25,-.5,.75]);
const saved=inverseInertiaComponents(m);
assert.deepEqual(saved,[4,.25,-.5,5,.75,6]);
R.SdpMatrix3Ops.fromBuffer(new Float32Array([7,1,2,8,3,9]),m);
assert.deepEqual(saved,[4,.25,-.5,5,.75,6]);
assert.deepEqual(inverseInertiaComponents(m),[7,1,2,8,3,9]);
console.log(JSON.stringify({kind:'real_16_slot_matrix_regression',non_diagonal:true,unused_slots_ignored:true,copy_survives_alias_write:true,new_worlds:0,new_public_steps:0}));
