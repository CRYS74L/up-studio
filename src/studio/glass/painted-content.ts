/** Keep state that cloneNode omits without walking the whole tree each frame. */
export function paintedContentSync(source:HTMLElement,copy:HTMLElement){
 const originals=[source,...source.querySelectorAll<HTMLElement>('*')],copies=[copy,...copy.querySelectorAll<HTMLElement>('*')];
 const scrolling=originals.flatMap((element,i)=>element.scrollWidth>element.clientWidth||element.scrollHeight>element.clientHeight||element.scrollLeft||element.scrollTop?[[element,copies[i]] as const]:[]);
 const canvases=originals.flatMap((element,i)=>element instanceof HTMLCanvasElement?[[element,copies[i] as HTMLCanvasElement] as const]:[]);
 return ()=>{for(const [element,target] of scrolling){target.scrollLeft=element.scrollLeft;target.scrollTop=element.scrollTop;}
  for(const [element,target] of canvases)if(element.width&&element.height)target.getContext('2d')?.drawImage(element,0,0);
 };
}
