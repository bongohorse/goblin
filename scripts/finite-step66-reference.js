// Independent double Newton/Euler ODE. No Rapier/Three/project math imports.
export const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,k)=>a.map(x=>x*k),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=a=>Math.hypot(...a);
export const av=v=>[v.x,v.y,v.z],aq=q=>[q.x,q.y,q.z,q.w],ov=v=>({x:v[0],y:v[1],z:v[2]}),oq=q=>({x:q[0],y:q[1],z:q[2],w:q[3]});
export const normalize=q=>mul(q,1/length(q));
export const product=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-dot(a.slice(0,3),b.slice(0,3))];
export const inverse=q=>[-q[0],-q[1],-q[2],q[3]];
export function rotate(q,v){const t=mul(cross(q.slice(0,3),v),2);return add(v,add(mul(t,q[3]),cross(q.slice(0,3),t)));}
export function inertia(b,q,v,inv=false){const axes=product(normalize(q),normalize(aq(b.principal_frame))),local=rotate(inverse(axes),v),values=av(b.inertia);return rotate(axes,local.map((x,i)=>inv?x/values[i]:x*values[i]));}
export function solve3(matrix,rhs){const a=matrix.map((r,i)=>[...r,rhs[i]]);for(let i=0;i<3;i++){let pivot=i;for(let j=i+1;j<3;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;if(Math.abs(a[pivot][i])<1e-14)throw Error('singular_constraint');[a[i],a[pivot]]=[a[pivot],a[i]];const p=a[i][i];for(let k=i;k<4;k++)a[i][k]/=p;for(let j=0;j<3;j++)if(j!==i){const c=a[j][i];for(let k=i;k<4;k++)a[j][k]-=c*a[i][k];}}return a.map(r=>r[3]);}
export function initialState(bodies,connected=false){const result=bodies.flatMap(b=>{const q=normalize(aq(b.rotation)),x=connected?mul(rotate(q,av(b.anchor)),-1):av(b.world_com);return [...x,...av(b.linear_velocity),...q,...av(b.angular_velocity)];});return [...result,0];}
export function decode(y,bodies){return bodies.map((b,i)=>{const k=13*i;return {...structuredClone(b),world_com:ov(y.slice(k,k+3)),linear_velocity:ov(y.slice(k+3,k+6)),rotation:oq(normalize(y.slice(k+6,k+10))),angular_velocity:ov(y.slice(k+10,k+13))};});}
export function derivative(y,bodies,torques,connected){
  const states=bodies.map((b,j)=>{const k=13*j,q=normalize(y.slice(k+6,k+10)),w=y.slice(k+10,k+13),r=rotate(q,av(b.anchor)),iw=inertia(b,q,w),alpha=inertia(b,q,sub(torques[j],cross(w,iw)),true);return {q,w,r,alpha,v:y.slice(k+3,k+6)};});
  let reaction=[0,0,0];
  if(connected){const basis=[[1,0,0],[0,1,0],[0,0,1]],cols=basis.map(e=>{let col=mul(e,1/bodies[0].mass+1/bodies[1].mass);for(let j=0;j<2;j++)col=sub(col,cross(states[j].r,inertia(bodies[j],states[j].q,cross(states[j].r,e),true)));return col;});
    const b=sub(add(cross(states[0].alpha,states[0].r),cross(states[0].w,cross(states[0].w,states[0].r))),add(cross(states[1].alpha,states[1].r),cross(states[1].w,cross(states[1].w,states[1].r))));reaction=solve3(basis.map((_,i)=>cols.map(c=>c[i])),mul(b,-1));
  }
  const out=states.flatMap((s,j)=>{const f=mul(reaction,j?-1:1),alpha=add(s.alpha,inertia(bodies[j],s.q,cross(s.r,f),true)),qdot=mul(product([...s.w,0],s.q),.5);return [...s.v,...mul(f,1/bodies[j].mass),...qdot,...alpha];});out.push(states.reduce((power,s,j)=>power+dot(torques[j],s.w),0));return out;
}
export function integrate(bodies,torques,T,n,connected=false){
  if(!Number.isInteger(n)||n<1||!Number.isFinite(T)||T<=0||bodies.length!==2||torques.length!==2)throw Error('invalid_reference_request');
  for(const b of bodies)if(!(b.mass>0)||!av(b.inertia).every(i=>i>0))throw Error('invalid_reference_mass');
  let y=initialState(bodies,connected);const h=T/n;
  for(let step=0;step<n;step++){const k1=derivative(y,bodies,torques,connected),k2=derivative(add(y,mul(k1,h/2)),bodies,torques,connected),k3=derivative(add(y,mul(k2,h/2)),bodies,torques,connected),k4=derivative(add(y,mul(k3,h)),bodies,torques,connected);y=y.map((x,i)=>x+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);for(let j=0;j<2;j++){const k=13*j+6;y.splice(k,4,...normalize(y.slice(k,k+4)));}}
  if(!y.every(Number.isFinite))throw Error('nonfinite_reference');return {bodies:decode(y,bodies),work_J:y.at(-1),h,n,T};
}
export function invariants(bodies){let H=[0,0,0],P=[0,0,0],E=0;for(const b of bodies){const q=aq(b.rotation),w=av(b.angular_velocity),v=av(b.linear_velocity),p=mul(v,b.mass);H=add(H,add(inertia(b,q,w),cross(av(b.world_com),p)));P=add(P,p);E+=.5*dot(w,inertia(b,q,w))+.5*b.mass*dot(v,v);}
 const r=bodies.map(b=>rotate(aq(b.rotation),av(b.anchor))),points=bodies.map((b,j)=>add(av(b.world_com),r[j])),speeds=bodies.map((b,j)=>add(av(b.linear_velocity),cross(av(b.angular_velocity),r[j])));return {H,P,E,anchor_gap_m:length(sub(points[0],points[1])),anchor_speed_m_s:length(sub(speeds[0],speeds[1]))};}
export function difference(a,b){return {angular:Math.max(...a.map((s,j)=>length(sub(av(s.angular_velocity),av(b[j].angular_velocity))))),linear:Math.max(...a.map((s,j)=>length(sub(av(s.linear_velocity),av(b[j].linear_velocity))))),position:Math.max(...a.map((s,j)=>length(sub(av(s.world_com),av(b[j].world_com))))),rotation:Math.max(...a.map((s,j)=>{let p=normalize(aq(s.rotation)),q=normalize(aq(b[j].rotation));if(dot(p,q)<0)q=mul(q,-1);return 4*Math.asin(Math.min(1,length(sub(p,q))/2));}))};}
