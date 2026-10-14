import test from 'node:test';
import assert from 'node:assert/strict';

async function feature(path) {
  try { return await import(path); }
  catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND') return {}; throw error; }
}
const data = await feature('../js/data.js');
const rules = await feature('../js/progression.js');

test('the playable catalogue contains the requested 25 species across three islands', () => {
  assert.ok(data.FISH, 'Fish catalogue is implemented');
  const fish = Object.values(data.FISH);
  const counts = Object.fromEntries(['Normal','Rare','Legendary','Mythic','???'].map(r => [r, fish.filter(f => f.rarity === r).length]));
  assert.deepEqual(counts, {Normal:10,Rare:8,Legendary:4,Mythic:2,'???':1});
  assert.equal(new Set(fish.map(f => f.id)).size, 25);
  assert.deepEqual(['palm','coral','frost'].map(id => fish.filter(f => f.islandId === id).length), [7,8,10]);
});

test('sampling endpoints stay in the chosen island and species weight range', () => {
  assert.equal(typeof data.sampleFish, 'function');
  for (const islandId of ['palm','coral','frost']) for (const rng of [() => 0, () => 1 - Number.EPSILON]) {
    const sample = data.sampleFish(islandId, 'ocean', rng);
    const species = data.FISH[sample.speciesId];
    assert.equal(species.islandId, islandId);
    assert.ok(Number.isInteger(sample.weightGrams));
    assert.ok(sample.weightGrams >= species.minGrams && sample.weightGrams <= species.maxGrams);
  }
  assert.throws(() => data.sampleFish('unknown', 'starter'), /island/i);
});

test('XP threshold boundaries unlock the proper island', () => {
  assert.equal(typeof rules.levelForXp, 'function');
  for (const [xp, level] of [[0,1],[99,1],[100,2],[399,2],[400,3],[1599,4],[1600,5]]) assert.equal(rules.levelForXp(xp), level);
  assert.equal(rules.canVisit('coral',399), false);
  assert.equal(rules.canVisit('coral',400), true);
  assert.equal(rules.canVisit('frost',1599), false);
  assert.equal(rules.canVisit('frost',1600), true);
  assert.equal(rules.canVisit('unknown',5000), false);
  assert.equal(rules.levelForXp(NaN), 1);
  assert.equal(rules.levelForXp(-100), 1);
});

test('catch prices and kg display use grams without rounding the stored weight', () => {
  assert.equal(typeof rules.fishPrice, 'function');
  assert.equal(rules.fishPrice({speciesId:'r01',weightGrams:3420}),96);
  assert.equal(rules.fishPrice({speciesId:'n01',weightGrams:100}),1);
  assert.equal(rules.formatKg(3420),'3.42');
  assert.equal(rules.formatKg(100),'0.10');
  assert.throws(() => rules.fishPrice({speciesId:'missing',weightGrams:1000}));
});
