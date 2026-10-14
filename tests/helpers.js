export function memoryStorage(initial={}) {
  const values=new Map(Object.entries(initial));
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}
export async function loadFeature(path) {
  try { return await import(path); } catch(error) { if(error.code==='ERR_MODULE_NOT_FOUND') return {}; throw error; }
}
