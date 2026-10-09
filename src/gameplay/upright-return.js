import {UprightSlice, targetAtStep, TARGET_REACTION} from './upright-assist.js';

// One predeclared return candidate. The original controller and legacy curve stay byte-identical.
export const RETURN_R1 = Object.freeze({id:'R1',restore:72,total:90});
export function returnAtStep(elapsed) {
  if (!Number.isInteger(elapsed) || elapsed < 18) return targetAtStep(elapsed);
  if (elapsed >= RETURN_R1.total) return targetAtStep(60);
  const x=(elapsed-18)/RETURN_R1.restore;
  const angle=TARGET_REACTION.angle*(1-10*x**3+15*x**4-6*x**5);
  return {phase:'RETURN',angle,up:{x:Math.sin(angle),y:Math.cos(angle),z:0}};
}
export class UprightReturnSlice extends UprightSlice {
  constructor({returnProfile='legacy',...options}={}) {
    if (!['legacy','R1'].includes(returnProfile)) throw Error('Invalid return profile');
    super(options);this.returnProfile=returnProfile;
  }
  targetAssist() {
    if (this.returnProfile!=='R1' || this.reaction!=='T1' || !this.enabled || this.targetStart===null) return super.targetAssist();
    return {id:this.reaction,...returnAtStep(this.steps-this.targetStart)};
  }
}
