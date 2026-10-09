export const corruptions=[
 ['missing case',r=>r.cases.pop()],
 ['repeat id',r=>r.cases[0].runs[0].repeat=6],
 ['wrong build id',r=>r.provenance.build_id='not-a-build'],
 ['positive torque beyond strict cap',r=>r.cases[1].runs.forEach(x=>x.commands.applied_encoded_pair[0][0]=Math.fround(.15))],
 ['intervening step',r=>r.cases[1].runs[0].phase.splice(3,0,{op:'world.step',step:0})],
 ['wrong API units',r=>r.cases[1].runs.forEach(x=>x.commands.api_units='Nm*s')],
 ['incorrect reset readback',r=>r.cases[1].runs[0].after_reset[0].x=1],
 ['fault actual readback changed to intended',r=>r.cases[25].runs.forEach(x=>x.accumulators[0]={x:.14999999105930328,y:0,z:0})],
 ['physical POST H corrupted',r=>r.cases[0].runs.forEach(x=>x.metrics.physical_delta_H[0]=1)],
 ['PRE alignment uncertainty corrupted',r=>r.cases[1].runs.forEach(x=>x.metrics.reference_actual.initial_alignment_difference.angular=1)],
 ['convergence forged',r=>r.cases[1].runs.forEach(x=>x.metrics.reference_actual.convergence[0].error.angular=1)],
 ['frozen discrimination guard enlarged',r=>r.local_discrimination.guard_uOmega=1],
 ['engine certification invented',r=>r.engine_precision.general_envelope=.001],
 ['unscoped physics approval',r=>r.pass_physics=true],
 ['nested standing approval',r=>r.cases[0].runs[0].metrics.standing_approved=true]
 ,['nonnumeric integration default',r=>r.cases[1].runs.forEach(x=>x.environment.integration.contact_erp='NaN')]
 ,['string dynamic flag',r=>r.cases[1].runs.forEach(x=>x.environment.bodies[0].dynamic='false')]
 ,['string POST quaternion',r=>r.cases[1].runs.forEach(x=>x.post[0].rotation.x=String(x.post[0].rotation.x))]
 ,['unknown POST state field',r=>r.cases[1].runs.forEach(x=>x.post[0].reference_frame='unknown')]
 ,['missing integration default',r=>r.cases[1].runs.forEach(x=>delete x.environment.integration.contact_erp)]
 ,['string recovery boolean',r=>r.cases[1].runs.forEach(x=>x.environment.integration.softBodiesRecovery.edgeSpeculation='false')]
 ,['unexpected public inverse component',r=>r.cases[1].runs.forEach(x=>x.public_inverse_tensors[0].push(0))]
 ,['unknown reset phase field',r=>r.cases[1].runs.forEach(x=>x.phase[0].extra_force=true)]
];
