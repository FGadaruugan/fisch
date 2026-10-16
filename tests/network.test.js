import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const feature=await loadFeature('../js/network.js');
test('browser offline hint stays separate from explicit static server check and failures',async()=>{
  assert.equal(typeof feature.createNetworkMonitor,'function');let options,t=0;
  const monitor=feature.createNetworkMonitor({window:new EventTarget(),navigator:{onLine:false},baseURL:'https://example.test/fisch/',now:()=>t+=12,fetch:async(url,opts)=>{options=opts;return new Response('{"schema":1}',{headers:{'content-type':'application/json'}});}});
  assert.equal(monitor.getState().hint,'offline');assert.equal(monitor.getState().check.status,'idle');await monitor.check();assert.equal(monitor.getState().check.status,'success');assert.equal(monitor.getState().hint,'offline');assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');monitor.dispose();
  const bad=feature.createNetworkMonitor({baseURL:'https://example.test/',fetch:async()=>{throw new Error('offline');}});await bad.check();assert.equal(bad.getState().check.status,'error');bad.dispose();
});
