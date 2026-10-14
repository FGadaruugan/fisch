import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const feature=await loadFeature('../js/fishing.js');
const ticket={id:'ticket-1',speciesId:'n01',weightGrams:100,islandId:'palm',rodId:'starter',waitSeconds:2,biteSeconds:1.8};
function setup(){assert.equal(typeof feature.createFishingController,'function');const results=[];const game=feature.createFishingController({onFinish:result=>results.push(result)});return{game,results};}
function advance(game,phase,limit=1000){for(let i=0;i<limit&&game.getView().phase!==phase;i++)game.tick(0.05);assert.equal(game.getView().phase,phase);}

test('cast release waits then bite response enters the reel game',()=>{
  const {game}=setup();game.start(ticket);game.tick(0.05);
  assert.ok(game.getView().charge>0);game.release();assert.equal(game.getView().phase,'waiting');
  advance(game,'bite');game.press();assert.equal(game.getView().phase,'reeling');
  assert.equal(game.getView().progress,0.28);
});
test('missing the bite reports one escaped outcome',()=>{
  const {game,results}=setup();game.start(ticket);game.release();advance(game,'bite');advance(game,'escaped');
  for(let i=0;i<100;i++)game.tick(0.05);
  assert.deepEqual(results,[{ticketId:'ticket-1',outcome:'escaped'}]);
});
test('tracking a moving fish fills the reel and reports one catch',()=>{
  const {game,results}=setup();game.start(ticket);game.release();advance(game,'bite');game.press();
  for(let i=0;i<2400&&!results.length;i++){const v=game.getView();if(v.bar<v.target)game.press();else game.release();game.tick(1/120);}
  assert.deepEqual(results,[{ticketId:'ticket-1',outcome:'caught'}]);
  for(let i=0;i<100;i++)game.tick(0.05);assert.equal(results.length,1);
});
test('cancelling any active stage prevents stale awards',()=>{
  for(const phase of ['charging','waiting','bite','reeling']){
    const {game,results}=setup();game.start(ticket);
    if(phase!=='charging')game.release();
    if(phase==='bite'||phase==='reeling')advance(game,'bite');
    if(phase==='reeling')game.press();
    game.cancel();for(let i=0;i<1000;i++)game.tick(0.05);
    assert.equal(game.getView().phase,'idle');assert.deepEqual(results,[]);
  }
});
test('focus pause freezes an active wait and releasing input prevents a stuck hold',()=>{
  const {game}=setup();game.start(ticket);game.release();game.tick(0.05);
  const before=game.getView().remaining;game.setPaused(true);
  for(let i=0;i<500;i++)game.tick(0.05);
  assert.equal(game.getView().remaining,before);game.setPaused(false);game.tick(0.05);
  assert.ok(game.getView().remaining<before);
});
test('reel bar speed and reflected target remain bounded',()=>{
  const {game}=setup();game.start({...ticket,speciesId:'u01'});game.release();advance(game,'bite');game.press();
  game.tick(0.05);assert.ok(Math.abs(game.getView().bar-0.5275)<1e-10);
  game.release();game.tick(0.05);assert.ok(Math.abs(game.getView().bar-0.51)<1e-10);
  for(let i=0;i<38;i++){game.press();game.tick(0.05);const v=game.getView();assert.ok(v.target>=0&&v.target<=1);assert.ok(v.bar>=0&&v.bar<=1);}
  assert.ok(game.getView().target<0.6,'Target reflects at the top rather than escaping the bar');
});
test('a non-winning reel reaches its twenty-second timeout',()=>{
  const {game,results}=setup();game.start(ticket);game.release();advance(game,'bite');game.press();
  let seek=true,elapsed=0;
  for(let i=0;i<3000&&!results.length;i++){
    const v=game.getView();if(v.progress>0.6)seek=false;if(v.progress<0.35)seek=true;
    const desired=seek?v.target:(v.target>0.5?0.12:0.88);
    if(v.bar<desired)game.press();else game.release();
    game.tick(1/120);elapsed+=1/120;
  }
  assert.equal(results[0]?.outcome,'escaped');assert.ok(elapsed>=19.99&&elapsed<20.1);
});
