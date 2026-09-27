/** Copy only paint/scroll state; do not measure every descendant's layout. */
export function paintedContentSync(source:HTMLElement,copy:HTMLElement){
 const originals=[source,...source.querySelectorAll<HTMLElement>('*')],copies=[copy,...copy.querySelectorAll<HTMLElement>('*')];
 const textPairs:Array<[Text,Text]>=[];const a=document.createTreeWalker(source,NodeFilter.SHOW_TEXT),b=document.createTreeWalker(copy,NodeFilter.SHOW_TEXT);let node:Node|null;while((node=a.nextNode())){const target=b.nextNode();if(target)textPairs.push([node as Text,target as Text]);}
 const controls=originals.flatMap((element,i)=>element.matches('.ui-segment-thumb,button[aria-pressed],[data-status]')?[[element,copies[i]] as const]:[]);
 const scrolling=originals.flatMap((element,i)=>element.scrollLeft||element.scrollTop||element.matches('[style*="overflow"],.s-chart-viewport,.s-direct-videos,.s-account-list,.s-chat-history-list,.s-sheet-body')?[[element,copies[i]] as const]:[]);
 const canvases=originals.flatMap((element,i)=>element instanceof HTMLCanvasElement?[[element,copies[i] as HTMLCanvasElement] as const]:[]);
 const svgs=originals.flatMap((element,i)=>element.matches('svg[data-chart-renderer]')?[[element,copies[i],''] as [HTMLElement,HTMLElement,string]]:[]);
 return ()=>{for(const [text,target] of textPairs){if(text.data!==target.data)target.data=text.data;}for(const [element,target] of controls){for(const attr of ['style','aria-pressed','data-status','data-active']){const value=element.getAttribute(attr);if(value!==target.getAttribute(attr)){if(value===null)target.removeAttribute(attr);else target.setAttribute(attr,value)}}}for(const [element,target] of scrolling){if(target.scrollLeft!==element.scrollLeft)target.scrollLeft=element.scrollLeft;if(target.scrollTop!==element.scrollTop)target.scrollTop=element.scrollTop;}
 for(const [element,target] of canvases)if(element.width&&element.height)target.getContext('2d')?.drawImage(element,0,0);
 for(const pair of svgs){for(const attribute of ['width','height','viewBox']){const value=pair[0].getAttribute(attribute);if(value!==null&&pair[1].getAttribute(attribute)!==value)pair[1].setAttribute(attribute,value)}const html=pair[0].innerHTML;if(html!==pair[2]){pair[1].innerHTML=html;pair[2]=html;}}
 };
}
