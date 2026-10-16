export const CACHE_PREFIX='fisch-resources-v1-';
export const READY_PATH='./__fisch_core_ready__';
export const MANIFEST_PATH='./__fisch_resource_manifest__';
export function validateManifest(raw,baseURL,expectedBuild){
  if(!raw||raw.schema!==1||! /^[a-f0-9]{24}$/.test(raw.build)||!Array.isArray(raw.files)||!raw.files.length||raw.files.length>500)throw new Error('INVALID_MANIFEST');
  if(expectedBuild&&raw.build!==expectedBuild)throw new Error('BUILD_MISMATCH');
  const base=new URL('./',baseURL),seen=new Set();
  for(const file of raw.files){
    if(!file||typeof file.url!=='string'||!/^\.\/[A-Za-z0-9_./-]+(?:\?fisch-build=[a-f0-9]{24})?$/.test(file.url)||file.url.split('/').includes('..'))throw new Error('INVALID_URL');
    const url=new URL(file.url,base),path=url.pathname.slice(base.pathname.length);
    if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname)||!(/^(?:index\.html|css\/[\w.-]+\.css|(?:web\/)?js\/(?:chunks\/)?[\w.-]+\.js(?:\.LEGAL\.txt)?|assets\/[\w./-]+\.(?:svg|png)|manifest\.webmanifest|CREDITS\.txt)$/.test(path))||/account(?:-callback)?(?:\.|\/)/.test(path))throw new Error('INVALID_URL');
    if(url.search&&url.searchParams.get('fisch-build')!==raw.build)throw new Error('INVALID_BUILD_URL');
    if(!Number.isSafeInteger(file.bytes)||file.bytes<0||!/^[a-f0-9]{64}$/.test(file.sha256)||seen.has(file.url))throw new Error('INVALID_FILE');seen.add(file.url);
  }
  if(raw.entry!=='./index.html'||!seen.has(raw.entry)||!raw.groups?.core||!raw.groups?.social||!raw.groups?.extras)throw new Error('INVALID_GROUP');
  const visiting=new Set(),done=new Set();
  function visit(id){if(done.has(id))return;if(visiting.has(id))throw new Error('CYCLIC_GROUP');const group=raw.groups[id];if(!group||!Array.isArray(group.files)||!Array.isArray(group.requires)||group.files.some(url=>!seen.has(url)))throw new Error('INVALID_GROUP');visiting.add(id);group.requires.forEach(visit);visiting.delete(id);done.add(id);}
  Object.keys(raw.groups).forEach(visit);
  for(const tier of ['core','extended','full'])if(!Array.isArray(raw.tiers?.[tier])||!raw.tiers[tier].length||raw.tiers[tier].some(id=>!raw.groups[id]))throw new Error('INVALID_TIER');
  if(!getTierFiles(raw,'core').some(f=>f.url===raw.entry)||getTierFiles(raw,'full').length!==raw.files.length)throw new Error('INVALID_CLOSURE');
  return raw;
}
export function getGroupFiles(manifest,ids){const urls=new Set(),visited=new Set();function add(id){if(visited.has(id))return;visited.add(id);const group=manifest.groups[id];group.requires.forEach(add);group.files.forEach(url=>urls.add(url));}ids.forEach(add);return manifest.files.filter(file=>urls.has(file.url));}
export function getTierFiles(manifest,tier){return getGroupFiles(manifest,manifest.tiers[tier]||[]);}
export const cacheName=(baseURL,build)=>CACHE_PREFIX+encodeURIComponent(new URL('./',baseURL).pathname)+'-'+build;
export async function verifyResponse(response,file,crypto=globalThis.crypto){
  if(!response?.ok||response.type==='opaque')throw new Error('DOWNLOAD_FAILED');
  const buffer=await response.clone().arrayBuffer();if(buffer.byteLength!==file.bytes)throw new Error('SIZE_MISMATCH');
  const digest=await crypto.subtle.digest('SHA-256',buffer),hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==file.sha256)throw new Error('HASH_MISMATCH');return true;
}
