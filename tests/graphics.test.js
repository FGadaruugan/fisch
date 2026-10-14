import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const graphics=await loadFeature('../js/performance.js');
test('frame pacing respects a lower target without changing simulation time',()=>{
  assert.equal(typeof graphics.createFramePacer,'function');const pacer=graphics.createFramePacer(30);let rendered=0,total=0;
  for(let i=0;i<=120;i++){const frame=pacer.step(i*1000/120);if(frame.draw)rendered++;total+=frame.delta;}
  assert.ok(rendered>=30&&rendered<=31);assert.ok(Math.abs(total-1)<0.000001);
});
test('resuming after a long pause clamps the next simulation delta',()=>{
  assert.equal(typeof graphics.createFramePacer,'function');const pacer=graphics.createFramePacer(60);pacer.step(0);
  assert.ok(pacer.step(10000).delta<=0.05);pacer.reset();assert.equal(pacer.step(11000).delta,0);
});
test('malformed graphics preferences fall back to supported quality and FPS',()=>{
  assert.equal(typeof graphics.normalizeSettings,'function');const s=graphics.normalizeSettings({quality:'fake',targetFps:-1,renderScale:100,exposure:NaN,shadows:'yes'});
  assert.equal(s.quality,'auto');assert.equal(s.targetFps,60);assert.ok(s.renderScale<=1.5);assert.equal(s.exposure,1);assert.equal(s.shadows,true);
});
test('adaptive quality responds to sustained pressure instead of a single slow frame',()=>{
  assert.equal(typeof graphics.createAdaptiveQuality,'function');const q=graphics.createAdaptiveQuality(2);
  q.tick({fps:20,hz:60},0.05,60);assert.equal(q.level,2);
  for(let i=0;i<65;i++)q.tick({fps:20,hz:60},0.05,60);
  assert.equal(q.level,1);
});
