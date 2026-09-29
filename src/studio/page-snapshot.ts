import {clonePresentation} from './clone-presentation';
const motionLayers=new WeakMap<HTMLElement,HTMLElement>();
export const snapshotMotionLayer=(host:HTMLElement)=>motionLayers.get(host)??host;
let signature='',sheet:CSSStyleSheet|undefined;
export function capturePage(clip?:HTMLElement|null,presentation=false){
 const main=document.querySelector<HTMLElement>('.studio > .s-main');if(!main)return null;
 const bounds=main.getBoundingClientRect(),region=clip?.getBoundingClientRect(),top=region?Math.max(0,region.top):0,viewportSlide=!clip||!clip.closest('.s-panel'),left=viewportSlide?0:region?.left??bounds.left;
 const host=document.createElement('div');host.className='s-route-snapshot';host.dataset.viewportSlide=String(viewportSlide);host.setAttribute('aria-hidden','true');host.inert=true;
 Object.assign(host.style,{position:'fixed',left:left+'px',top:top+'px',width:(viewportSlide?document.documentElement.clientWidth:region?.width??bounds.width)+'px',height:Math.max(0,(region?Math.min(innerHeight,region.bottom):innerHeight)-top)+'px',overflow:'clip',pointerEvents:'none',zIndex:'20'});
 const wrapper=document.createElement('div');wrapper.className='studio';Object.assign(wrapper.style,{display:'block',position:'relative',width:'100%',height:'100%',minHeight:'0',background:'transparent'});
 if(presentation)for(const previous of document.querySelectorAll<HTMLElement>('.studio>.s-route-snapshot')){const r=previous.getBoundingClientRect(),old=clonePresentation(previous);old.classList.remove('s-route-snapshot');Object.assign(old.style,{position:'absolute',left:(r.left-left)+'px',top:(r.top-top)+'px',width:r.width+'px',height:r.height+'px',transform:'none',zIndex:'0'});wrapper.append(old)}
 const copy=clonePresentation(main),style=getComputedStyle(main);copy.removeAttribute('style');Object.assign(copy.style,{position:'absolute',left:(bounds.left-left)+'px',top:(bounds.top-top)+'px',width:bounds.width+'px',height:bounds.height+'px',margin:'0',maxWidth:'none',transform:'none',opacity:presentation?style.opacity:'1',backgroundColor:style.backgroundColor,padding:style.padding,zIndex:'1'});
 wrapper.append(copy);host.append(wrapper);motionLayers.set(host,wrapper);main.closest('.studio')!.append(host);return host;
}
export function warmSnapshotStyles(){
 const styles=[...document.styleSheets];const next=styles.map(s=>s.href??s.ownerNode?.textContent??'').join('|');
 if(!sheet||next!==signature){const css=styles.flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).join('\n').replace(/:root(\[[^\]]+\])?/g,(_match,attribute)=>attribute?':host('+attribute+')':':host');sheet=new CSSStyleSheet();sheet.replaceSync(css+'\n.studio{display:block!important;min-height:0!important;background:transparent!important}.s-main{position:absolute!important;left:var(--snapshot-left)!important;top:var(--snapshot-top)!important;width:var(--snapshot-width)!important;margin:0!important;max-width:none!important;opacity:1!important;transform:none!important}');signature=next;}
}

export function snapshotStyleSheet(){warmSnapshotStyles();return sheet!;}
