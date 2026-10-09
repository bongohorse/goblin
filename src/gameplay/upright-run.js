import {UprightReturnSlice} from './upright-return.js';
import {CONFIG_B,UprightSession} from './upright-session.js';

// Initial start, reset and variant change share ownership and construction.
export function createUprightRun(options,sessionOptions){
  const sim=new UprightReturnSlice({config:CONFIG_B,...options});
  try{return {sim,session:new UprightSession(sim,sessionOptions)};}
  catch(error){sim.dispose();throw error;}
}
