import Ajv from 'ajv';
import baseline from '../../../docs/research/standing-lab/baseline-config.json' with {type:'json'};
import configSchema from '../../../docs/research/standing-lab/config.schema.json' with {type:'json'};
import resultSchema from '../../../docs/research/standing-lab/result.schema.json' with {type:'json'};
import {freeze,norm,sub,add,rotate,vec} from './math.js';
const ajv=new Ajv({allErrors:true,strict:true});
const configValidator=ajv.compile(configSchema),resultValidator=ajv.compile(resultSchema);
export const BASELINE=freeze(baseline);
export function validateConfig(input){
  if(!configValidator(input))throw Error('Invalid config: '+ajv.errorsText(configValidator.errors));
  const config=structuredClone(input),ids=new Set(config.bodies.map(b=>b.id));
  if(ids.size!==15||new Set(config.bodies.map(b=>b.collider_id)).size!==15||new Set(config.joints.map(j=>j.id)).size!==14)throw Error('Duplicate IDs');
  if(config.bodies.filter(b=>b.body_class==='foot').map(b=>b.id).sort().join()!=='footL,footR')throw Error('Foot taxonomy');
  if(!['pelvis','torso','head'].every(id=>ids.has(id)))throw Error('Missing trunk');
  for(const b of config.bodies){
    if(Math.abs(Math.hypot(...Object.values(b.rotation))-1)>1e-6)throw Error('Nonunit quaternion');
    if(b.shape.type==='cuboid'&&Object.values(b.shape.half).some(x=>x<=0))throw Error('Invalid cuboid');
    if(b.friction<0||b.linearDamping<0||b.angularDamping<0||b.restitution<0||b.restitution>1)throw Error('Invalid material/damping');
  }
  const byId=new Map(config.bodies.map(b=>[b.id,b]));const pairs=new Set();
  for(const j of config.joints){
    if(!ids.has(j.parent)||!ids.has(j.child)||j.parent===j.child)throw Error('Joint taxonomy');
    const pair=[j.parent,j.child].sort().join(':');if(pairs.has(pair))throw Error('Duplicate joint pair');pairs.add(pair);
    if(j.type==='revolute'&&(!j.limits||j.limits[0]>0||j.limits[1]<0||norm(sub(j.axis,vec(1)))>1e-8))throw Error('Hinge contract');
    if(j.type==='spherical'&&j.limits!==null)throw Error('Unsupported spherical limits');
    const a=byId.get(j.parent),b=byId.get(j.child);
    if(norm(sub(add(a.position,rotate(j.anchorA,a.rotation)),j.position))>1e-6||norm(sub(add(b.position,rotate(j.anchorB,b.rotation)),j.position))>1e-6)throw Error('Initial anchor conflict');
  }
  const reached=new Set(['pelvis']);for(let pass=0;pass<15;pass++)for(const j of config.joints){if(reached.has(j.parent))reached.add(j.child);if(reached.has(j.child))reached.add(j.parent);}
  if(reached.size!==15)throw Error('Disconnected rig');
  return freeze(config);
}
export function validateResult(result){if(!resultValidator(result))throw Error('Invalid result: '+ajv.errorsText(resultValidator.errors));return result;}
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export async function configIdentity(config){const hash=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(config)));const hex=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');return {config_id:'config:sha256:'+hex,experiment_id:'passive-v1:'+hex};}
