// Diagnostic-only independent implementation; no passive measurement imports.
import {Quaternion,Vector3} from 'three';
const q=o=>new Quaternion(o.x,o.y,o.z,o.w).normalize();
export function hingeOracle(parent,child,frame1,frame2){
  const a=q(parent).multiply(q(frame1)),b=q(child).multiply(q(frame2));
  const rel=a.clone().invert().multiply(b).normalize();
  // Matrix/tangent derivation of swing-twist about local X, invariant under q -> -q.
  const y=new Vector3(0,1,0).applyQuaternion(rel),z=new Vector3(0,0,1).applyQuaternion(rel);
  const angle=Math.atan2(y.z-z.y,y.y+z.z);
  const axisA=new Vector3(1,0,0).applyQuaternion(a),axisB=new Vector3(1,0,0).applyQuaternion(b);
  // Pinned RevoluteJoint::angle uses asin(x), unlike swing-twist when axes drift.
  const engineAngle=2*Math.asin(Math.max(-1,Math.min(1,rel.x)))*(rel.w<0?-1:1);
  return {angle,engine_angle:engineAngle,axis_error:axisA.distanceTo(axisB),relative:{x:rel.x,y:rel.y,z:rel.z,w:rel.w}};
}
