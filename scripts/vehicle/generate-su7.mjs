import { mkdir, writeFile } from 'node:fs/promises'

const chunks = []
const bufferViews = []
const accessors = []
const meshes = []
const nodes = []
const materials = []
let byteOffset = 0

function align4(value) { return (value + 3) & ~3 }
function addChunk(buffer, target)
{
    const aligned = align4(byteOffset)
    if(aligned > byteOffset) chunks.push(Buffer.alloc(aligned - byteOffset))
    byteOffset = aligned
    const index = bufferViews.length
    bufferViews.push({ buffer: 0, byteOffset, byteLength: buffer.length, ...(target ? { target } : {}) })
    chunks.push(buffer)
    byteOffset += buffer.length
    return index
}
function addAccessor(array, componentType, type, target, min, max)
{
    const buffer = Buffer.from(array.buffer, array.byteOffset, array.byteLength)
    const view = addChunk(buffer, target)
    const count = array.length / ({ SCALAR:1, VEC2:2, VEC3:3, VEC4:4 }[type])
    const index = accessors.length
    accessors.push({ bufferView:view, componentType, count, type, ...(min?{min}:{}), ...(max?{max}:{}) })
    return index
}
function addMaterial(name, color, metallic=0, roughness=0.7, emissive=null)
{
    const index = materials.length
    materials.push({ name, pbrMetallicRoughness:{ baseColorFactor:color, metallicFactor:metallic, roughnessFactor:roughness }, ...(emissive?{emissiveFactor:emissive}:{}), doubleSided:false })
    return index
}
function geometryAccessors(positions, indices)
{
    const p = new Float32Array(positions)
    const i = new Uint16Array(indices)
    const mins=[Infinity,Infinity,Infinity], maxs=[-Infinity,-Infinity,-Infinity]
    for(let n=0;n<p.length;n+=3) for(let j=0;j<3;j++){ mins[j]=Math.min(mins[j],p[n+j]); maxs[j]=Math.max(maxs[j],p[n+j]) }
    return {
        position:addAccessor(p,5126,'VEC3',34962,mins,maxs),
        indices:addAccessor(i,5123,'SCALAR',34963,[0],[Math.max(...i)]),
    }
}
const cube = geometryAccessors([
    -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,0.5,-0.5, -0.5,0.5,-0.5,
    -0.5,-0.5, 0.5, 0.5,-0.5, 0.5,0.5, 0.5, -0.5,0.5, 0.5,
], [0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0])
function cylinderGeometry(segments=16)
{
    const pos=[], idx=[]
    for(let z of [-0.5,0.5]) for(let s=0;s<segments;s++){ const a=s/segments*Math.PI*2; pos.push(Math.cos(a),Math.sin(a),z) }
    const bottom=pos.length/3; pos.push(0,0,-0.5); const top=pos.length/3; pos.push(0,0,0.5)
    for(let s=0;s<segments;s++){
        const n=(s+1)%segments, a=s, b=n, c=segments+s, d=segments+n
        idx.push(a,b,d,a,d,c, bottom,b,a, top,c,d)
    }
    return geometryAccessors(pos,idx)
}
const cylinder = cylinderGeometry()

const grey=addMaterial('雅灰',[0.32,0.34,0.35,1],0.38,0.52)
const dark=addMaterial('轮胎',[0.025,0.03,0.035,1],0.05,0.82)
const glass=addMaterial('玻璃',[0.04,0.08,0.10,0.72],0.05,0.18)
const white=addMaterial('前灯',[1,1,1,1],0,0.25,[1,1,1])
const red=addMaterial('尾灯',[1,0.015,0.01,1],0,0.28,[1,0.015,0.01])
const amber=addMaterial('转向灯',[1,0.30,0.01,1],0,0.28,[1,0.30,0.01])

function addMesh(name, geo, material)
{
    const index=meshes.length
    meshes.push({name:`${name}Geometry`,primitives:[{attributes:{POSITION:geo.position},indices:geo.indices,material}]})
    return index
}
function addNode(name, parent, mesh=null, translation=null, scale=null, rotation=null)
{
    const index=nodes.length
    nodes.push({name,...(mesh!==null?{mesh}:{}),...(translation?{translation}:{}),...(scale?{scale}:{}),...(rotation?{rotation}:{}),children:[]})
    if(parent!==null) nodes[parent].children.push(index)
    return index
}
function box(name,parent,pos,size,material)
{
    return addNode(name,parent,addMesh(name,cube,material),pos,size)
}
const root=addNode('vehicleRoot',null)
const chassis=addNode('chassis',root)
box('bodyPainted',chassis,[0,0,0.63],[4.55,1.82,0.48],grey)
box('bodyPaintedShoulder',chassis,[-0.12,0,0.95],[3.7,1.70,0.32],grey)
box('bodyPaintedHood',chassis,[1.42,0,1.08],[1.55,1.66,0.18],grey)
box('bodyPaintedDuckTail',chassis,[-2.05,0,1.10],[0.30,1.52,0.12],grey)
box('glass',chassis,[-0.40,0,1.34],[2.15,1.40,0.52],glass)
box('headlights',chassis,[2.20,-0.60,0.96],[0.10,0.36,0.12],white)
box('headlightsRight',chassis,[2.20,0.60,0.96],[0.10,0.36,0.12],white)
box('backLights',chassis,[-2.28,0,1.02],[0.08,1.46,0.10],red)
box('stopLights',chassis,[-2.29,0,1.02],[0.06,1.46,0.10],red)
box('blinkerLeft',chassis,[-2.30,-0.77,1.01],[0.06,0.10,0.10],amber)
box('blinkerRight',chassis,[-2.30,0.77,1.01],[0.06,0.10,0.10],amber)
const wheelContainer=addNode('wheelContainer',chassis)
const wheelSuspension=addNode('wheelSuspension',wheelContainer)
const wheelRot=[Math.SQRT1_2,0,0,Math.SQRT1_2]
addNode('wheelCylinder',wheelSuspension,addMesh('wheelCylinder',cylinder,dark),[0,0,0],[0.43,0.43,0.24],wheelRot)
addNode('wheelPainted',wheelSuspension,addMesh('wheelPainted',cylinder,grey),[0,0,0],[0.30,0.30,0.255],wheelRot)
for(const name of ['antenna','cell1','cell2','cell3','energy']) addNode(name,chassis)
for(const node of nodes) if(node.children.length===0) delete node.children

const binary=Buffer.concat(chunks)
const json={asset:{version:'2.0',generator:'folio-2025 SU7 generator'},scene:0,scenes:[{nodes:[root]}],nodes,meshes,materials,accessors,bufferViews,buffers:[{byteLength:binary.length}]}
let jsonBuffer=Buffer.from(JSON.stringify(json),'utf8')
jsonBuffer=Buffer.concat([jsonBuffer,Buffer.alloc(align4(jsonBuffer.length)-jsonBuffer.length,0x20)])
const binPadding=align4(binary.length)-binary.length
const binBuffer=Buffer.concat([binary,Buffer.alloc(binPadding)])
const header=Buffer.alloc(12); header.write('glTF',0); header.writeUInt32LE(2,4); header.writeUInt32LE(12+8+jsonBuffer.length+8+binBuffer.length,8)
const jsonHeader=Buffer.alloc(8); jsonHeader.writeUInt32LE(jsonBuffer.length,0); jsonHeader.writeUInt32LE(0x4E4F534A,4)
const binHeader=Buffer.alloc(8); binHeader.writeUInt32LE(binBuffer.length,0); binHeader.writeUInt32LE(0x004E4942,4)
const glb=Buffer.concat([header,jsonHeader,jsonBuffer,binHeader,binBuffer])
const outputDirectory=new URL('../../static/vehicle/',import.meta.url)
await mkdir(outputDirectory,{recursive:true})
await writeFile(new URL('su7.glb',outputDirectory),glb)
await writeFile(new URL('su7-compressed.glb',outputDirectory),glb)
console.log(`Generated SU7 GLB assets (${glb.byteLength} bytes each)`)
