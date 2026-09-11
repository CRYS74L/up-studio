let signature='',sheet:CSSStyleSheet|undefined;
// A closed, inert shadow tree is only the outgoing visual. It has no React effects,
// query observers, duplicate accessible controls, or IDs shared with the live page.
export function capturePage(){
 const main=document.querySelector<HTMLElement>('.studio > .s-main');if(!main)return null;
 const bounds=main.getBoundingClientRect(),host=document.createElement('div');host.className='s-route-snapshot';host.setAttribute('aria-hidden','true');host.inert=true;host.dataset.theme=document.documentElement.dataset.theme??'light';
 Object.assign(host.style,{position:'fixed',left:bounds.left+'px',top:'0',width:bounds.width+'px',height:innerHeight+'px',overflow:'clip',pointerEvents:'none',zIndex:'20'});
 warmSnapshotStyles();
 const root=host.attachShadow({mode:'closed'});root.adoptedStyleSheets=[sheet!];host.style.setProperty('--snapshot-top',bounds.top+'px');
 const wrapper=document.createElement('div');wrapper.className='studio';const copy=main.cloneNode(true) as HTMLElement;copy.removeAttribute('style');wrapper.append(copy);root.append(wrapper);main.closest('.studio')!.append(host);
 const canvases=[...main.querySelectorAll('canvas')],copies=[...copy.querySelectorAll('canvas')];canvases.forEach((canvas,i)=>{const r=canvas.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)copies[i]?.getContext('2d')?.drawImage(canvas,0,0)});
 return host;
}

export function warmSnapshotStyles(){
 const styles=[...document.styleSheets];const next=styles.map(s=>s.href??s.ownerNode?.textContent??'').join('|');
 if(!sheet||next!==signature){const css=styles.flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).join('\n').replace(/:root/g,':host');sheet=new CSSStyleSheet();sheet.replaceSync(css+'\n.studio{display:block!important;min-height:0!important;background:transparent!important}.s-main{position:absolute!important;left:0!important;top:var(--snapshot-top)!important;width:100%!important;margin:0!important;max-width:none!important;opacity:1!important;transform:none!important}');signature=next;}
}
