import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {createGoblinRig} from '../src/goblin-rig.js';
import {createRigDebug} from '../src/rig-debug.js';
await RAPIER.init();

test('debug teardown disposes real Three resources and cannot be revived by a retained control',()=>{
  // DOM construction is stubbed; event dispatch, Three resources and Rapier contacts are real.
  class Panel extends EventTarget {style={};remove(){this.removed=true;}}
  const panel=new Panel(),previousDocument=globalThis.document;
  globalThis.document={createElement:()=>panel,body:{append:()=>{}}};
  const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
  const scene=new THREE.Scene();let debug;
  try{
    world.createCollider(RAPIER.ColliderDesc.cuboid(6,.2,6).setTranslation(0,-.2,0));
    const rig=createGoblinRig(RAPIER,world);for(let i=0;i<300;i++)world.step();
    debug=createRigDebug(scene,world,rig);
    function change(name){const event=new Event('change');Object.defineProperty(event,'target',{value:{dataset:{view:name},checked:true}});panel.dispatchEvent(event);}
    for(const name of ['colliders','joints','contacts'])change(name);
    debug.update(true);assert.ok(debug.state.contactCount>0);assert.equal(scene.children.length,3);
    let disposedGeometries=0,disposedMaterials=0;
    for(const object of scene.children){assert.ok(object.geometry.drawRange.count>0);object.geometry.addEventListener('dispose',()=>disposedGeometries++);object.material.addEventListener('dispose',()=>disposedMaterials++);}
    debug.dispose();assert.equal(disposedGeometries,3);assert.equal(disposedMaterials,3);assert.equal(scene.children.length,0);assert.equal(panel.removed,true);
    assert.deepEqual(debug.state,{enabled:[],contactCount:0,resources:0});
    change('colliders');debug.update(true);debug.dispose();
    assert.equal(scene.children.length,0,'stale control must not recreate scene/GPU resources');
    assert.equal(disposedGeometries,3,'teardown is idempotent');
    rig.dispose();assert.equal(world.bodies.len(),0);assert.equal(world.impulseJoints.len(),0);
  }finally{debug?.dispose();world.free();if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});
