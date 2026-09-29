let snapshotId=0;
/** Share the live document's styles/fonts; isolate only identity and interaction. */
export function clonePresentation(source:HTMLElement){
  const copy=source.cloneNode(true) as HTMLElement,prefix='snapshot-'+(++snapshotId)+'-',ids=new Map<string,string>();
 const canvases=source.querySelectorAll('canvas');copy.querySelectorAll('canvas').forEach((c,i)=>{const original=canvases[i],r=original.getBoundingClientRect();if(original.width&&original.height&&r.bottom>0&&r.top<innerHeight)c.getContext('2d')?.drawImage(original,0,0)});
 const originals=source.querySelectorAll<HTMLElement>('section,article,.s-media'),blocks=copy.querySelectorAll<HTMLElement>('section,article,.s-media');
 originals.forEach((element,i)=>{const r=element.getBoundingClientRect(),block=blocks[i];if(r.top>=innerHeight||r.bottom<=0){block.replaceChildren();Object.assign(block.style,{height:r.height+'px',minHeight:r.height+'px',boxSizing:'border-box',visibility:'hidden'})}});
 copy.querySelectorAll<HTMLElement>('[id]').forEach(e=>{const id=e.id;ids.set(id,prefix+id);e.id=prefix+id});
 copy.querySelectorAll('[clip-path],[filter],[mask],[fill],[stroke],[style],[href],[xlink\\:href]').forEach(e=>{for(const a of [...e.attributes]){if(!a.value.includes('url(')&&a.name!=='href'&&a.name!=='xlink:href')continue;let value=a.value.replace(/url\(["']?#([^\)"']+)["']?\)/g,(all,id)=>ids.has(id)?`url(#${ids.get(id)})`:all);if((a.name==='href'||a.name==='xlink:href')&&value.startsWith('#')&&ids.has(value.slice(1)))value='#'+ids.get(value.slice(1));if(value!==a.value)e.setAttribute(a.name,value)}});

 return copy;
}
