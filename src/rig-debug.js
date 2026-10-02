import * as THREE from 'three';
import {worldAnchor} from './goblin-rig.js';

// Opt-in visualization only. No forces, poses, collision settings or gameplay state writes.
export function createRigDebug(scene,world,rig){
  const panel=document.createElement('fieldset');panel.id='rigDebug';
  panel.innerHTML='<legend>Rig v1 · Debug</legend><label><input type="checkbox" data-view="colliders"> Collider (cyan)</label><label><input type="checkbox" data-view="joints"> Gelenke (gelb)</label><label><input type="checkbox" data-view="contacts"> Kontakte (orange)</label>';
  Object.assign(panel.style,{position:'fixed',top:'80px',left:'12px',zIndex:'8',background:'#17120eee',color:'#fff',fontSize:'12px',display:'grid',gap:'4px'});
  document.body.append(panel);
  const objects=new Map(),enabled=new Set();let contactCount=0;
  const capacities={colliders:32768,joints:rig.joints.size*4,contacts:256};
  function allocate(name){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(capacities[name]*3),3).setUsage(THREE.DynamicDrawUsage));geometry.setDrawRange(0,0);
    const options={color:{colliders:0x32ffff,joints:0xffee33,contacts:0xff8533}[name],depthTest:false,depthWrite:false};
    const material=name==='contacts'?new THREE.PointsMaterial({...options,size:.055,sizeAttenuation:true}):new THREE.LineBasicMaterial(options);
    const object=name==='contacts'?new THREE.Points(geometry,material):new THREE.LineSegments(geometry,material);
    object.frustumCulled=false;object.renderOrder=10;scene.add(object);objects.set(name,object);
  }
  function remove(name){const object=objects.get(name);if(!object)return;scene.remove(object);object.geometry.dispose();object.material.dispose();objects.delete(name);}
  panel.addEventListener('change',event=>{const name=event.target.dataset.view;if(!name)return;
    if(event.target.checked){enabled.add(name);allocate(name);}else{enabled.delete(name);remove(name);if(name==='contacts')contactCount=0;}
  });
  function fill(name,values){const object=objects.get(name),attribute=object.geometry.getAttribute('position');
    const length=Math.min(values.length,attribute.array.length);attribute.array.set(values.subarray?values.subarray(0,length):values.slice(0,length));attribute.needsUpdate=true;object.geometry.setDrawRange(0,Math.floor(length/3));
  }
  return {
    update(contactsValid){
      if(enabled.has('colliders'))fill('colliders',world.debugRender(undefined,c=>rig.byCollider.has(c.handle)).vertices);
      if(enabled.has('joints')){
        const vertices=[];
        for(const {spec} of rig.joints.values()){
          const a=worldAnchor(rig.byId.get(spec.parent).body,spec.anchorA),b=worldAnchor(rig.byId.get(spec.child).body,spec.anchorB);
          vertices.push(a.x,a.y,a.z,b.x,b.y,b.z,a.x-.025,a.y,a.z,a.x+.025,a.y,a.z);
        }fill('joints',vertices);
      }
      if(enabled.has('contacts')){
        const vertices=[],seen=new Set();
        if(contactsValid)for(const {collider} of rig.byId.values())world.contactPairsWith(collider,other=>{
          const key=[collider.handle,other.handle].sort((a,b)=>a-b).join(':');if(seen.has(key))return;seen.add(key);
          world.contactPair(collider,other,manifold=>{for(let i=0;i<manifold.numSolverContacts()&&vertices.length<256*3;i++){
            const p=manifold.solverContactPoint(i);if(p)vertices.push(p.x,p.y,p.z);
          }});
        });
        contactCount=vertices.length/3;fill('contacts',vertices);
      }
    },
    get state(){return {enabled:[...enabled],contactCount,resources:objects.size};},
    dispose(){for(const name of [...objects.keys()])remove(name);enabled.clear();panel.remove();}
  };
}
