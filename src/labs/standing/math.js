export const vec = (x=0,y=0,z=0) => ({x,y,z});
export const add=(a,b)=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a,b)=>vec(a.x-b.x,a.y-b.y,a.z-b.z);
export const scale=(a,s)=>vec(a.x*s,a.y*s,a.z*s);
export const norm=a=>Math.hypot(a.x,a.y,a.z);
export const cross=(a,b)=>vec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
export const conjugate=q=>({x:-q.x,y:-q.y,z:-q.z,w:q.w});
export const multiply=(a,b)=>({x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z});
export function rotate(v,q){const t=scale(cross(q,v),2);return add(v,add(scale(t,q.w),cross(q,t)));}
export const point=(body,p)=>add(body.translation(),rotate(p,body.rotation()));
export function rotationDistance(a,b){
  const an=Math.hypot(a.x,a.y,a.z,a.w),bn=Math.hypot(b.x,b.y,b.z,b.w);
  // asin chord avoids acos precision loss near identical orientations.
  const sign=a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w<0?-1:1;
  const chord=Math.hypot(a.x/an-sign*b.x/bn,a.y/an-sign*b.y/bn,a.z/an-sign*b.z/bn,a.w/an-sign*b.w/bn);
  return 4*Math.asin(Math.min(1,chord/2));
}
export function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export function jointObservation({joint,spec}){
  const a=joint.body1(),b=joint.body2();
  const out={id:spec.id,anchor_error:norm(sub(point(a,joint.anchor1()),point(b,joint.anchor2()))),axis_error:null,angle:null,limit_violation:null};
  if(spec.type==='revolute'){
    const qa=multiply(a.rotation(),joint.frameX1()),qb=multiply(b.rotation(),joint.frameX2());
    const rel=multiply(conjugate(qa),qb);
    const raw=2*Math.atan2(rel.x,rel.w);
    out.angle=Math.atan2(Math.sin(raw),Math.cos(raw));
    out.axis_error=norm(sub(rotate(vec(1),qa),rotate(vec(1),qb)));
    out.limit_violation=Math.max(0,spec.limits[0]-out.angle,out.angle-spec.limits[1]);
  }
  return out;
}
