// V2: pure, read-only analysis of exported traces. No physics or controller imports.
export const POINT_IDS=Object.freeze(['head','torso','pelvis','footL','footR']);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const vector=v=>v&&['x','y','z'].every(k=>Number.isFinite(v[k]));
const diff=(p,r)=>({d:p.x-r.x,c:r.z-p.z,y:p.y-r.y});
const length=v=>Math.hypot(v.x,v.y,v.z);
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2});
function up(q){
  const n=Math.hypot(q.x,q.y,q.z,q.w);
  const x=q.x/n,y=q.y/n,z=q.z/n,w=q.w/n;
  return {x:2*(x*y-w*z),y:1-2*(x*x+z*z),z:2*(y*z+w*x)};
}
const unwrap=(angle,previous)=>previous===null?angle:previous+Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));
function validate(record,role,issues){
  if(record?.role!==role)issues.push('role:'+role);
  if(!record?.pairId)issues.push('pair-id:'+role);
  if(record?.identity?.config?.id!=='B'||record.identity.dt!==1/60||!Number.isFinite(record.identity.mass)||record.identity.mass<=0||!record.identity.sources)issues.push('identity:'+role);
  const camera=record?.camera;
  if(!camera||!['projection','view'].every(k=>Array.isArray(camera[k])&&camera[k].length===16&&camera[k].every(Number.isFinite))||
    !Number.isFinite(camera.canvas?.width)||camera.canvas.width<=0||!Number.isFinite(camera.canvas?.height)||camera.canvas.height<=0)issues.push('camera:'+role);
  if(!Array.isArray(record?.trace)||record.trace.length!==361){issues.push('complete-steps-0-360:'+role);return;}
  for(let i=0;i<=360;i++){
    const t=record.trace[i];
    if(!t||typeof t!=='object'){issues.push('missing-step:'+role+':'+i);continue;}
    if(t.step!==i||t.time!==i/60)issues.push('step/time:'+role+':'+i);
    if(!Number.isFinite(t.torso?.tilt)||!Number.isFinite(t.pelvis?.tilt))issues.push('legacy-tilt:'+role+':'+i);
    if(!Array.isArray(t.observation?.bodies)||t.observation.bodies.length!==15||!t.observation?.controller||
      !Array.isArray(t.metrics?.feet)||t.metrics.feet.length!==2||!Array.isArray(t.metrics?.nonFootFloor)||!Number.isFinite(t.metrics.pelvisHeight)||
      t.metrics.feet.some(f=>!['footL','footR'].includes(f.id)||f.distance!==null&&!Number.isFinite(f.distance))||
      !Number.isFinite(t.maxAnchorError)||!t.commands||!Number.isFinite(t.commands.support)||!Number.isFinite(t.commands.motorCap)||!t.commands.torques||Object.values(t.commands.torques).some(v=>!vector(v)))issues.push('state:'+role+':'+i);
    for(const id of POINT_IDS){
      const p=t.observation?.points?.[id],q=p?.rotation;
      if(!vector(p?.position)||!vector(p?.velocity)||!vector(p?.angularVelocity)||
        !vector(q)||!Number.isFinite(q.w)||Math.hypot(q.x,q.y,q.z,q.w)===0)issues.push('point:'+role+':'+i+':'+id);
      else if(camera&&['projection','view'].every(k=>Array.isArray(camera[k])&&camera[k].length===16)&&camera.canvas){
        const screen=projectPoint(p.position,camera);if(!Number.isFinite(screen.x)||!Number.isFinite(screen.y))issues.push('projection:'+role+':'+i+':'+id);
      }
    }
  }
}
export function projectPoint(point,camera){
  const mul=(a,v)=>[0,1,2,3].map(row=>a[row]*v[0]+a[row+4]*v[1]+a[row+8]*v[2]+a[row+12]*v[3]);
  const v=mul(camera.projection,mul(camera.view,[point.x,point.y,point.z,1]));
  return {x:(v[0]/v[3]+1)*camera.canvas.width/2,y:(1-v[1]/v[3])*camera.canvas.height/2};
}
const range=(rows,get)=>{const values=rows.map(r=>({step:r.step,value:get(r)}));return {
  min:values.reduce((a,b)=>b.value<a.value?b:a),max:values.reduce((a,b)=>b.value>a.value?b:a)};};
function windowSummary(rows){
  return {steps:[rows[0].step,rows.at(-1).step],
    points:Object.fromEntries(POINT_IDS.map(id=>[id,{
      displacement:Object.fromEntries(['d','c','y'].map(axis=>[axis,range(rows,r=>r.points[id].displacement[axis])])),
      velocityRmsMps:Math.sqrt(rows.reduce((s,r)=>s+r.points[id].velocityNorm**2,0)/rows.length)}])),
    tilt:Object.fromEntries(['torso','pelvis'].map(id=>[id,Object.fromEntries(['beta','gamma','upDifference'].map(k=>[k,range(rows,r=>r.tilt[id][k])]))]))};
}
export function comparePair(reference,input){
  const issues=[];validate(reference,'reference',issues);validate(input,'input',issues);
  if(reference?.pairId!==input?.pairId)issues.push('reference-assignment');
  if(!equal(reference?.identity,input?.identity)||!equal(reference?.camera,input?.camera))issues.push('different-identity/camera');
  const hits=record=>(record?.events||[]).filter(e=>e?.kind==='impulse-observation');
  if(hits(reference).length)issues.push('input-in-reference');
  const h=hits(input);
  if(h.length!==1||h[0].step!==120||h[0].strength!==.4||!equal(h[0].direction,{x:1,y:0,z:0})||
    !equal(h[0].localPoint,{x:0,y:.30,z:0})||!vector(h[0].point)||!vector(h[0].deltaVelocity)||!vector(h[0].deltaAngularVelocity))issues.push('original-input');
  const allowed=new Set(['manual-reset','resume','scheduled-push','push-before','push-after','impulse-observation','interrupt','pause']);
  for(const record of [reference,input])for(const e of record?.events||[])
    if(!allowed.has(e?.kind)||e.kind==='interrupt'&&e.step<360||e.kind==='pause'&&e.step<360)issues.push('extra-interruption/input');
  if(!issues.length)for(let i=0;i<=120;i++)if(!equal(reference.trace[i],input.trace[i])){issues.push('different-pre-input-state:'+i);break;}
  const H={status:'unbewertet',questions:['Klar sichtbare eigene Reaktion?','In Schubrichtung von Eigenbewegung unterscheidbar?','Binnen 2 s kontrolliert abgeklungen und bereit?'],answers:null};
  if(issues.length)return {version:'V2',pairId:input?.pairId,Q:{valid:false,issues:[...new Set(issues)]},H,S:{status:'unbewertbar'}};
  const previous={reference:{torso:{beta:null,gamma:null},pelvis:{beta:null,gamma:null}},input:{torso:{beta:null,gamma:null},pelvis:{beta:null,gamma:null}}};
  const rows=input.trace.map((p,i)=>{
    const r=reference.trace[i],P=p.observation.points,R=r.observation.points,tilt={};
    for(const id of ['torso','pelvis']){
      const ur=up(R[id].rotation),up_=up(P[id].rotation),angles={};
      for(const [role,u] of [['reference',ur],['input',up_]]){
        angles[role]={beta:unwrap(Math.atan2(u.x,u.y),previous[role][id].beta),gamma:unwrap(Math.atan2(-u.z,u.y),previous[role][id].gamma)};
        previous[role][id]=angles[role];
      }
      tilt[id]={beta:angles.input.beta-angles.reference.beta,gamma:angles.input.gamma-angles.reference.gamma,
        upDifference:Math.acos(Math.max(-1,Math.min(1,ur.x*up_.x+ur.y*up_.y+ur.z*up_.z)))};
    }
    const points=Object.fromEntries(POINT_IDS.map(id=>{
      const v=subtract(P[id].velocity,R[id].velocity),angular=subtract(P[id].angularVelocity,R[id].angularVelocity);
      const ps=projectPoint(P[id].position,input.camera),rs=projectPoint(R[id].position,reference.camera);
      return [id,{displacement:diff(P[id].position,R[id].position),velocity:diff(P[id].velocity,R[id].velocity),velocityNorm:length(v),
        angularVelocity:angular,screenDeltaPx:{x:ps.x-rs.x,y:ps.y-rs.y}}];
    }));
    const relative={};
    for(const id of ['head','torso'])for(const base of ['pelvis','feet']){
      const bp=base==='feet'?midpoint(P.footL.position,P.footR.position):P.pelvis.position;
      const br=base==='feet'?midpoint(R.footL.position,R.footR.position):R.pelvis.position;
      const dp=subtract(P[id].position,bp),dr=subtract(R[id].position,br);
      relative[id+'-'+base]={displacement:diff(dp,dr),distanceDifference:length(dp)-length(dr)};
    }
    return {step:i,time:i/60,tau:i/60-2,points,tilt,relative};
  });
  const response=rows.slice(121,241),tail=rows.slice(241);
  const additional=Math.max(...input.trace.slice(121,241).map(t=>t.torso.tilt))-input.trace[120].torso.tilt;
  const allSafe=record=>record.trace.every(t=>!t.invalid&&t.maxAnchorError<=.15&&t.assisted&&
    !['DYNAMIC','DOWN','STOPPED'].includes(t.state)&&!t.metrics.nonFootFloor.length&&
    t.commands.motorCap<=20&&Object.values(t.commands.torques).every(v=>length(v)<=20)&&t.commands.support<=1.25*record.identity.mass*9.81);
  const returnState=input.trace[240],m=returnState.metrics;
  const returnEnvelope=returnState.assisted&&returnState.torso.tilt<=Math.PI/12&&returnState.pelvis.tilt<=Math.PI/12&&
    m.pelvisHeight>=.95&&m.pelvisHeight<=1.25&&m.feet.length===2&&m.feet.every(f=>f.distance!==null&&f.distance<=.03)&&
    m.feet.some(f=>f.distance!==null&&f.distance<=.005)&&!m.nonFootFloor.length;
  return {version:'V2',pairId:input.pairId,Q:{valid:true,issues:[],units:{displacement:'m',tilt:'rad',velocity:'m/s',angularVelocity:'rad/s',screen:'canvas px'},
    rows,windows:{response:windowSummary(response),returnTail:windowSummary(rows.slice(211,241)),after:windowSummary(tail)},
    legacyV1:{additionalTiltDeg:additional*180/Math.PI,thresholdDeg:2,pass:additional>=2*Math.PI/180},input:h[0]},
    H,S:{status:'beobachtet',referenceSafe:allSafe(reference),inputSafe:allSafe(input),returnEnvelopeAtTwoSeconds:returnEnvelope,
      limits:'Native command caps and observed states, no solver-internal force or complete collision/Standing acceptance.'}};
}
