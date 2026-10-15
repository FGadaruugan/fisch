/** Canonical game catalogue. Server and browser consume the same immutable data. */
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const GAME = freeze({version:1,capacity:100,maxXp:1_000_000_000,maxCoins:1_000_000_000,oceanSize:4000});
export const RARITIES = freeze(Object.assign(Object.create(null),{
  Normal: {weight:68,xp:12,price:12,speed:0.20,color:'#c0dcd9',label:'Normal'},
  Rare: {weight:25,xp:32,price:28,speed:0.28,color:'#5dafef',label:'Rare'},
  Legendary: {weight:6,xp:80,price:45,speed:0.36,color:'#efb955',label:'Legendary'},
  Mythic: {weight:0.9,xp:180,price:80,speed:0.44,color:'#c991f1',label:'Mythic'},
  '???': {weight:0.1,xp:400,price:150,speed:0.52,color:'#ff658f',label:'???'}
}));
export const RODS = freeze(Object.assign(Object.create(null),{
  starter:{id:'starter',name:'Driftwood Rod',description:'Таны анхны найдвартай саваа.',price:0,width:0.24,luck:1,color:'#a5825e'},
  river:{id:'river',name:'River Whisper',description:'Илүү өргөн удирдах бар, тайван таталт.',price:150,width:0.30,luck:1,color:'#60c9b5'},
  ocean:{id:'ocean',name:'Ocean Sovereign',description:'Өргөн бар, ховор загасны сонголтын жин +35%.',price:650,width:0.36,luck:1.35,color:'#e7b34e'},
  jade:{id:'jade',name:'Jade Current',description:'Хаш чулуун бариул, тогтвортой удирдлага. Ховор загасны сонголтын жин ×1.75.',price:10000,width:0.40,luck:1.75,color:'#43b89a'},
  temple:{id:'temple',name:'Temple Tide',description:'Эртний туурийн хүч. Ховор загасны сонголтын жин ×2.5.',price:50000,width:0.46,luck:2.5,color:'#c7a45c'},
  eclipse:{id:'eclipse',name:'Eclipse Relic',description:'Таван өргөлөөс сэрсэн нууц саваа. Ховор загасны сонголтын жин ×3.5.',price:100000,width:0.52,luck:3.5,color:'#ad8de0',acquisition:'trade'}
}));
export const SECRET_TRADE=freeze({rodId:'eclipse',islandId:'sanctuary',level:7,price:100000,speciesIds:['n11','r09','l05','m03','u02'],offset:[-112,-76],radius:7});
export const ISLANDS = freeze(Object.assign(Object.create(null),{
  palm:{id:'palm',name:'Palm Bay',subtitle:'Эхлэл бүхэн нэг эргээс',biome:'tropical',level:1,radius:180,center:[0,0],color:'#6cc9a8',sky:'#b1dfe0',sand:'#ead7ad',ground:'#638d4d',rock:'#8b9682',seed:1842},
  coral:{id:'coral',name:'Coral Reef',subtitle:'Шүрэн эргийн нууц',biome:'coral',level:3,radius:165,center:[-820,-650],color:'#ed998b',sky:'#d6d9e4',sand:'#f1c8b0',ground:'#798b5a',rock:'#aa6557',seed:8221},
  frost:{id:'frost',name:'Frostpeak',subtitle:'Мөсөн доорх домог',biome:'alpine',level:5,radius:210,center:[650,-1120],color:'#9bcde2',sky:'#c4dce9',sand:'#dbe7e5',ground:'#91a5a6',rock:'#718892',seed:9543},
  sanctuary:{id:'sanctuary',name:'Sunken Sanctuary',subtitle:'Таван загас, мартагдсан нэг нууц',biome:'ruins',level:7,radius:225,center:[1070,580],color:'#90b8a1',sky:'#c1d6d0',sand:'#d8ceae',ground:'#557a69',rock:'#747e76',seed:6274}
}));

const rows = [
 ['n01','Silver Minnow','Normal',100,450,'palm','fish','#a9d7db','#e8eff0',0.75],
 ['n02','River Perch','Normal',300,1400,'palm','fish','#6c8c58','#d3c67e',1.1],
 ['n03','Blue Sardine','Normal',100,600,'palm','fish','#4b85aa','#d7e0e4',0.7],
 ['n04','Reef Bass','Normal',1000,4000,'coral','fish','#73965b','#c4d2a1',1.2],
 ['n05','Coral Bream','Normal',500,3000,'coral','fish','#df9a8f','#f2cec0',1.35],
 ['n06','Red Snapper','Normal',1000,6000,'coral','fish','#c75850','#f0b892',1.15],
 ['n07','Ice Herring','Normal',200,1000,'frost','fish','#84b9c4','#edf8f9',0.75],
 ['n08','Snow Trout','Normal',800,4000,'frost','fish','#8bafc4','#eddbd2',1.0],
 ['n09','Arctic Cod','Normal',1000,8000,'frost','fish','#769394','#d9dfbb',0.85],
 ['n10','White Mackerel','Normal',500,3000,'frost','fish','#547b98','#e4e8e5',0.85],
 ['r01','Golden Carp','Rare',1500,8000,'palm','fish','#dba649','#f6d982',1.25],
 ['r02','Moon Trout','Rare',1000,5000,'palm','fish','#7c9de0','#d3d6ff',1.05],
 ['r03','Emerald Koi','Rare',700,3500,'palm','koi','#3caf8a','#f1e7d4',1.25],
 ['r04','Ruby Grouper','Rare',3000,15000,'coral','fish','#b9546c','#f6c0a0',1.45],
 ['r05','Flame Eel','Rare',1000,7000,'coral','eel','#d56835','#f2c55c',0.5],
 ['r06','Sunscale Pike','Rare',2000,12000,'coral','pike','#aa9a48','#e8cb61',0.7],
 ['r07','Crystal Salmon','Rare',3000,18000,'frost','fish','#89cdda','#e1b6e1',1.0],
 ['r08','Aurora Tuna','Rare',5000,25000,'frost','tuna','#557fd0','#79dacd',1.35],
 ['l01','Crown Marlin','Legendary',15000,70000,'palm','billfish','#42699e','#ddb951',0.9],
 ['l02','Sunfin Swordfish','Legendary',20000,90000,'coral','billfish','#c48247','#f4d077',1.0],
 ['l03','Glacier Shark','Legendary',40000,180000,'frost','shark','#6296ad','#dcebf0',1.1],
 ['l04','Starlight Ray','Legendary',10000,60000,'frost','ray','#556caa','#bbb9ee',1.7],
 ['m01','Phoenix Ray','Mythic',25000,120000,'coral','ray','#e99a62','#ffe3a1',1.9],
 ['m02','Frost Leviathan','Mythic',80000,400000,'frost','serpent','#62becd','#d7f4f5',0.8],
 ['u01','Abyssal Sovereign','???',150000,1000000,'frost','leviathan','#554987','#e889bf',1.5],
 ['n11','Mossfin Carp','Normal',1500,9000,'sanctuary','fish','#6d9c83','#d0d9a1',1.2],
 ['r09','Jade Koi','Rare',4000,22000,'sanctuary','koi','#36ad97','#e6d9a3',1.4],
 ['l05','Temple Arowana','Legendary',25000,140000,'sanctuary','fish','#b99c54','#f4dfa0',1.65],
 ['m03','Spirit Serpent','Mythic',100000,500000,'sanctuary','serpent','#80bfc2','#e0c6f3',0.9],
 ['u02','Eclipse Guardian','???',200000,1200000,'sanctuary','leviathan','#4b476b','#cfa0df',1.65]
];
export const FISH = freeze(Object.assign(Object.create(null),Object.fromEntries(rows.map(([id,name,rarity,minGrams,maxGrams,islandId,family,color,accent,girth]) => [id,{id,name,rarity,minGrams,maxGrams,islandId,visual:{family,color,accent,girth}}]))));
export const getFish = id => FISH[id] ?? null;
export const speciesForIsland = id => Object.values(FISH).filter(fish => fish.islandId === id);

/** Inclusive minimum, exclusive RNG upper endpoint; tolerate custom RNG returning 1. */
export function sampleFish(islandId, rodId = 'starter', rng = Math.random) {
  if (!ISLANDS[islandId]) throw new RangeError('Unknown island');
  const rod = RODS[rodId];
  if (!rod) throw new RangeError('Unknown rod');
  const draw = () => { const n = Number(rng()); return Math.min(1-Number.EPSILON,Math.max(0,Number.isFinite(n)?n:0.5)); };
  const available = speciesForIsland(islandId);
  const tiers = Object.entries(RARITIES).filter(([rarity]) => available.some(f => f.rarity === rarity));
  const weights = tiers.map(([rarity,meta]) => meta.weight * (rarity === 'Normal' ? 1 : rod.luck));
  let cursor = draw() * weights.reduce((a,b) => a+b,0);
  let tier = tiers.at(-1)[0];
  for (let index=0;index<tiers.length;index++) { cursor -= weights[index]; if (cursor < 0) { tier=tiers[index][0]; break; } }
  const choices=available.filter(f => f.rarity === tier);
  const fish=choices[Math.min(choices.length-1,Math.floor(draw()*choices.length))];
  return {speciesId:fish.id,weightGrams:fish.minGrams+Math.floor(draw()*(fish.maxGrams-fish.minGrams+1)),islandId};
}
