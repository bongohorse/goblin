import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import R from '@dimforge/rapier3d-compat';
import {createUprightRun} from '../src/gameplay/upright-run.js';
import {PlaygroundInspectionView} from '../src/gameplay/playground-inspection-view.js';
await R.init();

test('D1 single overlay binds real vertex colours/IDs/readout to one step and disposes all owned buffers',()=>{
  // DOM-independent render seam; native browser separately checks actual text/focus/input.
  const oldDocument=globalThis.document,oldOption=globalThis.Option;
  globalThis.document={createElement:()=>({})};globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
  const controls={inspectBody:{append(){},value:''},inspectJoint:{replaceChildren(){},append(){},value:''}};
  let listener=null;const panel={querySelector:id=>controls[id.slice(1)],addEventListener:(kind,fn)=>{listener=fn;},removeEventListener:(kind,fn)=>{assert.equal(fn,listener);listener=null;}};
  const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),feetMaterial=new THREE.MeshBasicMaterial(),floor=new THREE.Object3D(),grid=new THREE.Object3D();
  const {sim,session}=createUprightRun({reaction:'B'},{record:false,audit:false});
  const meshes=new Map([...sim.rig.byId.keys()].map(id=>[id,new THREE.Object3D()]));let view;
  try{
    view=new PlaygroundInspectionView(scene,meshes,{floor,grid,material,feetMaterial},panel);view.renderText=()=>{};view.rebind(sim);
    for(const [id,offset] of [['shoulderL',.003],['elbowL',.025]]){const j=sim.rig.joints.get(id).joint,a=j.anchor2();j.setAnchor2({x:a.x+offset,y:a.y,z:a.z});}
    view.settings.anchorGap=true;view.selected='upperArmL';view.selectedJoint='elbowL';view.update(sim,1000,true);
    const line=view.objects.get('joints'),colors=line.geometry.getAttribute('color'),positions=line.geometry.getAttribute('position'),sample=view.snapshot().anchorGap;
    for(const j of sample.joints){const expected=new THREE.Color(j.level.color);for(let v=j.start;v<j.start+j.count;v++){assert.ok(Math.abs(colors.getX(v)-expected.r)<1e-6);assert.ok(Math.abs(colors.getY(v)-expected.g)<1e-6);assert.ok(Math.abs(colors.getZ(v)-expected.b)<1e-6);}}
    assert.notEqual(colors.getX(sample.joints.find(j=>j.id==='shoulderL').start),colors.getX(sample.joints.find(j=>j.id==='elbowL').start));
    assert.equal(line.geometry.drawRange.count,140);assert.equal(view.objects.size,2);
    const before=view.snapshot();session.singleStep();view.update(sim,1010);
    assert.equal(view.snapshot().anchorGap.step,before.anchorGap.step);assert.equal(view.snapshot().readout.step,before.readout.step);
    view.update(sim,1011,true);assert.equal(view.snapshot().anchorGap.step,sim.steps);assert.equal(view.snapshot().readout.step,sim.steps);
    assert.equal(view.objects.get('joints'),line);assert.equal(line.geometry.getAttribute('position'),positions);assert.equal(line.geometry.getAttribute('color'),colors);
    for(const id of sim.rig.byId.keys()){view.selected=id;view.update(sim,1020,true);const s=view.snapshot();for(const j of s.readout.joints)assert.deepEqual(j.anchor_gap,s.anchorGap.joints.find(g=>g.id===j.id).anchor_gap);}
    const joint=sim.rig.joints.get('neck').joint,anchor=joint.anchor1.bind(joint);joint.anchor1=()=>({x:NaN,y:0,z:0});view.selected='head';view.selectedJoint='neck';view.update(sim,1021,true);
    assert.equal(view.snapshot().anchorGap.joints.find(j=>j.id==='neck').level.label,'N/A');assert.equal(view.snapshot().readout.joints[0].anchor_gap.value,null);assert.ok([...positions.array].every(Number.isFinite));assert.equal(view.objects.has('selectedJoint'),false);joint.anchor1=anchor;
    let geometryDisposed=0,materialDisposed=0;line.geometry.addEventListener('dispose',()=>geometryDisposed++);line.material.addEventListener('dispose',()=>materialDisposed++);
    view.settings.anchorGap=false;view.settings.joints=true;view.update(sim,1030,true);assert.equal(view.objects.get('joints'),line);assert.equal(line.material.vertexColors,false);
    view.settings.joints=false;view.apply();assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);
    view.settings.anchorGap=true;view.update(sim,1040,true);view.rebind(sim);assert.equal(view.selected,null);assert.equal(view.snapshot().anchorGap.step,sim.steps);assert.equal(view.objects.size,1);
    view.dispose();view.dispose();assert.equal(view.objects.size,0);assert.equal(scene.children.length,0);assert.equal(view.jointSample,null);assert.equal(listener,null);
  }finally{view?.dispose();session.dispose();material.dispose();feetMaterial.dispose();globalThis.document=oldDocument;globalThis.Option=oldOption;}
});
