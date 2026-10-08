// Regression from the preserved failed PRE; no engine/world initialization.
import assert from 'node:assert/strict';
import {law,PLAN,v} from './fullrig84-model.mjs';
import {independentLaw} from './fullrig84-reader.mjs';
import {exactWithinCap} from './review-actuation74.mjs';
const body={"rotation":{"x":0.00463924091309309,"y":0.3429667353630066,"z":-0.001784012303687632,"w":0.939334511756897},"angular_velocity":{"x":0.03493654355406761,"y":0.000004994933078705799,"z":-0.029795536771416664}};
const actual=law(body.rotation,v(body.angular_velocity)),expected=independentLaw(body);
assert.ok(Math.hypot(...actual.bounded)<=PLAN.controller.cap_Nm);
assert.ok(exactWithinCap(actual.bounded,PLAN.controller.cap_Nm));
assert.deepEqual(actual.encoded,expected.encoded);
assert.deepEqual(actual.pelvis,actual.encoded.map(x=>x===0?0:-x));
console.log(JSON.stringify({kind:'stored_failed_PRE_encoding_regression',new_worlds:0,new_public_steps:0,cap:PLAN.controller.cap_Nm,norm:Math.hypot(...actual.bounded)}));
