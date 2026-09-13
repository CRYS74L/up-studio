const jobs:Array<()=>void>=[];
let running=0;
function drain(){while(running<2&&jobs.length){running++;jobs.shift()!();}}
export function queueCoverDecode(work:()=>Promise<void>,urgent=false){
 return new Promise<void>((resolve,reject)=>{
  const start=()=>{work().then(resolve,reject).finally(()=>{running--;drain()})};
  if(urgent)jobs.unshift(start);else jobs.push(start);drain();
 });
}
const warmed=new Map<string,{image:HTMLImageElement;ready:Promise<void>;decoded:boolean}>();
export function warmCover(src:string){
 const cached=warmed.get(src);if(cached)return cached.ready;
 const image=new Image();image.decoding='async';image.src=src;
 const ready=queueCoverDecode(async()=>{await image.decode();const entry=warmed.get(src);if(entry)entry.decoded=true}).catch(()=>{warmed.delete(src)});
 warmed.set(src,{image,ready,decoded:false});if(warmed.size>48)warmed.delete(warmed.keys().next().value!);
 return ready;
}

export const isCoverReady=(src:string)=>warmed.get(src)?.decoded===true;
