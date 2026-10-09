import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import R from '@dimforge/rapier3d-compat';
import {CAMERA_VIEWS,frameCamera,resizeCamera} from '../src/gameplay/playground-cameras.js';
import {createUprightRun} from '../src/gameplay/upright-run.js';
import {pickBody} from '../src/grab.js';
await R.init();
function cameraFor(id){
  const view=CAMERA_VIEWS[id],c=id==='perspective'?new THREE.PerspectiveCamera(36,1,.05,40):new THREE.OrthographicCamera(-2,2,2,-2,.05,40);
  c.userData.span=4;c.up.fromArray(view.up);c.position.fromArray(view.direction);c.lookAt(0,0,0);c.updateMatrixWorld(true);return c;
}
const corners=b=>[b.min.x,b.max.x].flatMap(x=>[b.min.y,b.max.y].flatMap(y=>[b.min.z,b.max.z].map(z=>new THREE.Vector3(x,y,z))));
test('four camera definitions have true orthographic axis directions and unambiguous top up',()=>{
  for(const id of ['front','side','top']){
    const c=cameraFor(id),direction=c.getWorldDirection(new THREE.Vector3());
    assert.equal(c.isOrthographicCamera,true);
    assert.ok(direction.distanceTo(new THREE.Vector3(...CAMERA_VIEWS[id].direction).negate())<1e-10);
    const a=new THREE.Raycaster(),b=new THREE.Raycaster();a.setFromCamera(new THREE.Vector2(-.6,.2),c);b.setFromCamera(new THREE.Vector2(.6,.2),c);
    assert.ok(a.ray.direction.distanceTo(b.ray.direction)<1e-10);assert.ok(a.ray.origin.distanceTo(b.ray.origin)>1);
  }
  assert.deepEqual(CAMERA_VIEWS.top.up,[0,0,-1]);assert.equal(cameraFor('perspective').isPerspectiveCamera,true);
});
test('framing contains upright and wide/fallen bounds at narrow landscape and desktop aspects',()=>{
  for(const id of Object.keys(CAMERA_VIEWS))for(const aspect of [.25,.6,1,2.5])for(const bounds of [
    new THREE.Box3(new THREE.Vector3(-.65,0,-.4),new THREE.Vector3(.65,2.8,.4)),
    new THREE.Box3(new THREE.Vector3(-3,.02,-1.5),new THREE.Vector3(2,1,1.5))]){
    const c=cameraFor(id),target=new THREE.Vector3();frameCamera(c,target,bounds,aspect);
    for(const p of corners(bounds)){const ndc=p.project(c);assert.ok(Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1&&Math.abs(ndc.z)<1,id+' '+aspect+' fits all corners');}
    const pose=c.position.clone(),up=c.up.clone();c.zoom=.7;resizeCamera(c,aspect/2);
    assert.deepEqual(c.position,pose);assert.deepEqual(c.up,up);assert.equal(c.zoom,.7);
    assert.ok(c.projectionMatrix.elements.every(Number.isFinite));
  }
});
test('active-camera rays select native collider geometry in all four views without physics writes',()=>{
  const {sim,session}=createUprightRun({reaction:'B'},{record:false,audit:false});
  try{
    const before=sim.snapshot(),head=sim.rig.byId.get('head').body;
    for(const id of Object.keys(CAMERA_VIEWS)){
      const c=cameraFor(id);frameCamera(c,new THREE.Vector3(),new THREE.Box3(new THREE.Vector3(-1,0,-1),new THREE.Vector3(1,3,1)),1.2);
      const p=new THREE.Vector3().copy(head.translation()).project(c),raycaster=new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(p.x,p.y),c);
      const hit=pickBody(R,sim.world,sim.rig.byBody.keys(),raycaster.ray.origin,raycaster.ray.direction);
      assert.equal(sim.rig.byBody.get(hit.body.handle).spec.id,'head');assert.deepEqual(sim.snapshot(),before);
    }
  }finally{session.dispose();}
});
