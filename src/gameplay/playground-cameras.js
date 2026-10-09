import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export const CAMERA_VIEWS=Object.freeze({
  perspective:{label:'Perspektive',direction:[3.8,1.65,6],up:[0,1,0]},
  front:{label:'Front · von +Z',direction:[0,0,1],up:[0,1,0]},
  side:{label:'Seite · von +X',direction:[1,0,0],up:[0,1,0]},
  top:{label:'Oben · von +Y',direction:[0,1,0],up:[0,0,-1]}
});

export function resizeCamera(camera,aspect){
  if(camera.isPerspectiveCamera){
    camera.aspect=aspect;
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(Math.PI/10)/Math.min(1,aspect)));
  }else{
    const height=camera.userData.span/Math.min(1,aspect);
    camera.top=height/2;camera.bottom=-height/2;
    camera.left=-height*aspect/2;camera.right=height*aspect/2;
  }
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}

// Read-only bounds in world units; conservative fit includes every box corner.
export function frameCamera(camera,target,bounds,aspect){
  if(bounds.isEmpty())return;
  const center=bounds.getCenter(new THREE.Vector3()),inverse=camera.quaternion.clone().invert();
  const half=new THREE.Vector3();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new THREE.Vector3(x,y,z).sub(center).applyQuaternion(inverse);
    half.max(new THREE.Vector3(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z)));
  }
  resizeCamera(camera,aspect);camera.zoom=1;
  const direction=camera.getWorldDirection(new THREE.Vector3()).negate();
  let distance;
  if(camera.isPerspectiveCamera){
    const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    distance=Math.max(half.y/tangent,half.x/(tangent*aspect))*1.25+half.z;
  }else{
    camera.userData.span=2*Math.max(half.x,half.y,.1)*1.25;
    distance=Math.max(8,half.z+2);
  }
  camera.near=.05;camera.far=Math.max(40,distance+half.z+10);
  camera.position.copy(center).addScaledVector(direction,distance);
  target.copy(center);camera.lookAt(target);resizeCamera(camera,aspect);
}

export class PlaygroundCameras{
  constructor(targets,bounds){
    this.aspect=1;this.mode='perspective';this.states=new Map();this.navigation=false;
    for(const [id,view] of Object.entries(CAMERA_VIEWS)){
      const camera=id==='perspective'?new THREE.PerspectiveCamera(36,1,.05,40):new THREE.OrthographicCamera(-2,2,2,-2,.05,40);
      camera.userData.span=4;camera.up.fromArray(view.up);
      const target=bounds.getCenter(new THREE.Vector3());
      camera.position.copy(target).add(new THREE.Vector3(...view.direction));camera.lookAt(target);
      frameCamera(camera,target,bounds,1);
      const controls=new OrbitControls(camera,targets.get(id));
      controls.target.copy(target);controls.enableRotate=id==='perspective';controls.enablePan=true;
      controls.screenSpacePanning=true;controls.minDistance=.5;controls.maxDistance=30;
      controls.minZoom=.1;controls.maxZoom=10;
      controls.update();controls.saveState();controls.enabled=id===this.mode;
      this.states.set(id,{camera,controls,initialSpan:camera.userData.span,initialNear:camera.near,initialFar:camera.far,aspect:1});
    }
    this.setNavigation(false);
  }
  get camera(){return this.states.get(this.mode).camera;}
  get controls(){return this.states.get(this.mode).controls;}
  select(mode){
    if(!this.states.has(mode))throw Error('Unknown camera view');
    this.mode=mode;
    this.camera.updateMatrixWorld(true);
  }
  setNavigation(enabled){
    this.navigation=enabled;
    for(const [id,{controls}] of this.states){
      const gesture=id==='perspective'?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN;
      controls.mouseButtons.LEFT=enabled?gesture:null;
      controls.mouseButtons.RIGHT=gesture;controls.mouseButtons.MIDDLE=THREE.MOUSE.PAN;
      controls.touches.ONE=enabled?(id==='perspective'?THREE.TOUCH.ROTATE:THREE.TOUCH.PAN):null;
      controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
    }
  }
  resize(rects){
    for(const [id,state] of this.states){
      const rect=rects.find(r=>r.id===id);state.controls.enabled=!!rect;
      if(rect){state.aspect=Math.max(1,rect.width)/Math.max(1,rect.height);resizeCamera(state.camera,state.aspect);}
    }
    this.aspect=this.states.get(this.mode).aspect;
  }
  lock(locked,rects){for(const [id,state] of this.states)state.controls.enabled=!locked&&rects.some(r=>r.id===id);}
  frame(bounds){frameCamera(this.camera,this.controls.target,bounds,this.aspect);this.controls.update();}
  reset(){
    const state=this.states.get(this.mode);state.camera.userData.span=state.initialSpan;
    state.camera.near=state.initialNear;state.camera.far=state.initialFar;
    state.controls.reset();resizeCamera(state.camera,this.aspect);
  }
  snapshot(mode=this.mode){
    const {camera:c,controls}=this.states.get(mode);c.updateMatrixWorld(true);
    return {mode,label:CAMERA_VIEWS[mode].label,type:c.isOrthographicCamera?'orthographic':'perspective',
      convention:{front:'+Z',side:'+X',top:'+Y',top_up:'-Z',push:'+X'},
      position:c.position.toArray(),quaternion:c.quaternion.toArray(),up:c.up.toArray(),target:controls.target.toArray(),
      zoom:c.zoom,near:c.near,far:c.far,fov:c.isPerspectiveCamera?c.fov:null,
      frustum:c.isOrthographicCamera?{left:c.left,right:c.right,top:c.top,bottom:c.bottom}:null,
      projection:c.projectionMatrix.toArray(),view:c.matrixWorldInverse.toArray()};
  }
  dispose(){for(const {controls} of this.states.values())controls.dispose();this.states.clear();}
}
