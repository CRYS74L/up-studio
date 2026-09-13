let signature='',sheet:CSSStyleSheet|undefined;
/** A visual-only viewport snapshot. Native View Transitions suppress hit testing
 * on captured elements in some Chromium builds, so theme controls stay live. */
export function captureTheme(){
 const studio=document.querySelector<HTMLElement>('.studio');if(!studio)return null;
 const sheets=[...document.styleSheets],next=sheets.map(s=>s.href??s.ownerNode?.textContent??'').join('|');
 if(!sheet||next!==signature){sheet=new CSSStyleSheet();sheet.replaceSync(sheets.flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).join('\n').replace(/:root/g,':host'));signature=next;}
 const host=document.createElement('div');host.className='s-theme-snapshot';host.inert=true;host.setAttribute('aria-hidden','true');
 Object.assign(host.style,{position:'fixed',inset:'0',width:innerWidth+'px',height:innerHeight+'px',overflow:'clip',pointerEvents:'none',zIndex:'9999',background:getComputedStyle(document.documentElement).getPropertyValue('--bg')});
 for(const [key,value] of Object.entries(document.documentElement.dataset))host.dataset[key]=value;
 const rootStyle=getComputedStyle(document.documentElement);for(const name of rootStyle)if(name.startsWith('--'))host.style.setProperty(name,rootStyle.getPropertyValue(name));
 const root=host.attachShadow({mode:'closed'});root.adoptedStyleSheets=[sheet];const copy=studio.cloneNode(true) as HTMLElement;
 Object.assign(copy.style,{position:'absolute',top:-scrollY+'px',left:'0',width:studio.getBoundingClientRect().width+'px',minHeight:studio.scrollHeight+'px'});
 copy.querySelectorAll('.s-theme-snapshot,.s-route-snapshot,dialog').forEach(e=>e.remove());
 const originals=[...studio.querySelectorAll('canvas')],copies=[...copy.querySelectorAll('canvas')];
 originals.forEach((c,i)=>{const r=c.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight&&c.width&&c.height)copies[i]?.getContext('2d')?.drawImage(c,0,0)});
 root.append(copy);document.body.append(host);
 // Preserve scroll positions of the conversation and history panes.
 for(const selector of ['.s-chat-messages','.s-chat-history-list','.s-sync-history']){const a=studio.querySelector(selector),b=copy.querySelector(selector);if(a&&b){b.scrollTop=a.scrollTop;b.scrollLeft=a.scrollLeft}}
 return host;
}
