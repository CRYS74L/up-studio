const motionLayers=new WeakMap<HTMLElement,HTMLElement>();
export const snapshotMotionLayer=(host:HTMLElement)=>motionLayers.get(host)??host;
let signature='',sheet:CSSStyleSheet|undefined;
// A closed, inert shadow tree is only the outgoing visual. It has no React effects,
// query observers, duplicate accessible controls, or IDs shared with the live page.
export function capturePage(clip?:HTMLElement|null){
 const main=document.querySelector<HTMLElement>('.studio > .s-main');if(!main)return null;
 const canvases=[...main.querySelectorAll('canvas')];const visible=canvases.map(canvas=>{const r=canvas.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight});
 const bounds=main.getBoundingClientRect(),region=clip?.getBoundingClientRect(),top=region?Math.max(0,region.top):0,viewportSlide=!clip||!clip.closest('.s-panel'),left=viewportSlide?0:region?.left??bounds.left,host=document.createElement('div');host.className='s-route-snapshot';host.dataset.viewportSlide=String(viewportSlide);host.setAttribute('aria-hidden','true');host.inert=true;host.dataset.theme=document.documentElement.dataset.theme??'light';
 Object.assign(host.style,{position:'fixed',left:left+'px',top:top+'px',width:(viewportSlide?document.documentElement.clientWidth:region?.width??bounds.width)+'px',height:Math.max(0,(region?Math.min(innerHeight,region.bottom):innerHeight)-top)+'px',overflow:'clip',pointerEvents:'none',zIndex:'20'});
 warmSnapshotStyles();
 const root=host.attachShadow({mode:'closed'});root.adoptedStyleSheets=[sheet!];host.style.setProperty('--snapshot-top',(bounds.top-top)+'px');host.style.setProperty('--snapshot-left',(bounds.left-left)+'px');host.style.setProperty('--snapshot-width',bounds.width+'px');
 const wrapper=document.createElement('div');wrapper.className='studio';const copy=main.cloneNode(true) as HTMLElement;copy.removeAttribute('style');wrapper.append(copy);root.append(wrapper);wrapper.style.width='100%';wrapper.style.height='100%';motionLayers.set(host,wrapper);
 const copies=[...copy.querySelectorAll('canvas')];canvases.forEach((canvas,i)=>{if(visible[i]&&canvas.width&&canvas.height)copies[i]?.getContext('2d')?.drawImage(canvas,0,0)});
 main.closest('.studio')!.append(host);
 return host;
}

export function warmSnapshotStyles(){
 const styles=[...document.styleSheets];const next=styles.map(s=>s.href??s.ownerNode?.textContent??'').join('|');
 if(!sheet||next!==signature){const css=styles.flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).join('\n').replace(/:root(\[[^\]]+\])?/g,(_match,attribute)=>attribute?':host('+attribute+')':':host');sheet=new CSSStyleSheet();sheet.replaceSync(css+'\n.studio{display:block!important;min-height:0!important;background:transparent!important}.s-main{position:absolute!important;left:var(--snapshot-left)!important;top:var(--snapshot-top)!important;width:var(--snapshot-width)!important;margin:0!important;max-width:none!important;opacity:1!important;transform:none!important}');signature=next;}
}

export function snapshotStyleSheet(){warmSnapshotStyles();return sheet!;}
