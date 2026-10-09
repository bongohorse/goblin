export const VARIANTS=Object.freeze({
  B:Object.freeze({yieldProfile:'B',reaction:'B',returnProfile:'legacy'}),
  T1:Object.freeze({yieldProfile:'B',reaction:'T1',returnProfile:'legacy'}),
  R1:Object.freeze({yieldProfile:'B',reaction:'T1',returnProfile:'R1'})
});
export function variantOptions(id){
  if(!Object.hasOwn(VARIANTS,id))throw Error('Unknown variant. Choose B, T1 or R1.');
  return {...VARIANTS[id]};
}
// Shared by both routes. Explicit historical URLs retain their exact options.
export function optionsFromSearch(search){
  const p=new URLSearchParams(search);
  if(p.has('variant'))return variantOptions(p.get('variant'));
  if(!['yield','reaction','return'].some(k=>p.has(k)))return variantOptions('R1');
  return {yieldProfile:p.get('yield')||'B',reaction:p.get('reaction')||'B',returnProfile:p.get('return')||'legacy'};
}
export function variantId(options){return Object.keys(VARIANTS).find(id=>Object.entries(VARIANTS[id]).every(([k,v])=>options[k]===v))||'Historisch';}
