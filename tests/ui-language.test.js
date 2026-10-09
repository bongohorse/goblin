import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {variantOptions} from '../src/gameplay/upright-variants.js';

test('owned game, Playground and historical viewer UI uses English, including invalid variant errors',()=>{
  const html=['index.html','playground/index.html','gameplay/upright/index.html','gameplay/upright/comparison.html','labs/standing/index.html'];
  const source=['src/main.js','src/rig-debug.js','src/gameplay/upright-scene.js','src/gameplay/upright-comparison-view.js','src/gameplay/upright-variants.js'];
  for(const path of [...html,...source]){
    const text=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.doesNotMatch(text,/\b(wählen|Körperteil|Sicherheitsstopp|Initialisierung|Ziele|Runde beendet|Einzelschritt|Saugnapf|Gebläse|unbekannt|Schubser|Messung|Gespeicherter|Sichtbarkeit)\b/,path);
    if(html.includes(path))assert.match(text,/<html lang="en"/,path);
  }
  assert.throws(()=>variantOptions('unknown'),/Unknown variant\. Choose B, T1 or R1\./);
});
