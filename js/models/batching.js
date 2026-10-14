import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Bake only static meshes by material. Animated player joints and instancing stay separate. */
export function batchStaticMeshes(T,root,{recursive=false}={}) {
  root.updateWorldMatrix(true,true);
  const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),buckets=new Map(),nodes=[];
  const collect=node=>{
    if(!node.isMesh||node.isInstancedMesh||Array.isArray(node.material)||node.material.transparent)return;
    for(let p=node;p&&p!==root;p=p.parent)if(!p.visible)return;
    nodes.push(node);
  };
  if(recursive)root.traverse(collect);else root.children.forEach(collect);
  for(const node of nodes){const key=node.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(node);}
  for(const list of buckets.values()){
    if(list.length<2)continue;
    const clones=list.map(node=>node.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,node.matrixWorld)));
    const geometry=mergeGeometries(clones,false);
    clones.forEach(g=>g.dispose());if(!geometry)continue;
    const combined=new T.Mesh(geometry,list[0].material);combined.castShadow=list.some(n=>n.castShadow);combined.receiveShadow=list.some(n=>n.receiveShadow);root.add(combined);
    const originals=new Set();for(const node of list){node.parent.remove(node);originals.add(node.geometry);}originals.forEach(g=>g.dispose());
  }
}
