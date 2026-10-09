// Six starts fixed before execution; no variant selection or retries.
const action=(kind,step,extra={},policy={})=>({kind,step,...extra,policy:{step,...policy}});
const small=()=>action('small',120,{}, {upright:true});
export const RETURN_TRIALS=Object.freeze([
  {id:'reference',returnProfile:'R1',durationSteps:720,actions:[]},
  {id:'legacy-small',returnProfile:'legacy',durationSteps:720,actions:[small()]},
  {id:'R1-small',returnProfile:'R1',durationSteps:720,actions:[small()]},
  {id:'R1-grab',returnProfile:'R1',durationSteps:720,actions:[small(),action('grab',150,{body:'handL'},{upright:true,activeTarget:true}),action('move',156,{offset:{x:.2,y:.1,z:0}}),action('release',180)]},
  {id:'R1-off-reset',returnProfile:'R1',durationSteps:240,actions:[small(),action('off',150,{}, {activeTarget:true})]},
  {id:'R1-strong',returnProfile:'R1',durationSteps:720,actions:[action('strong',120,{}, {upright:true})]}
].map(p=>Object.freeze(p)));
