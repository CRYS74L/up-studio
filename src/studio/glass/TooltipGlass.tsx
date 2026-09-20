import {useEffect,useLayoutEffect,useState} from 'react';
import {GlassMaterial} from './GlassMaterial';
const selector='.s-chart-tooltip,[role="tooltip"]';
type Bounds={left:number;top:number;width:number;height:number;opacity:number;zIndex:number;radius:string};
/** ECharts owns its tooltip HTML. Its material is a sibling so content replacement
 * cannot remove the glass, and the sampler never captures the tooltip itself. */
export function TooltipGlass(){
 const [bounds,setBounds]=useState<Bounds|null>(null);
 useEffect(()=>{let frame=0,live=true;
  const read=()=>{frame=0;if(!live)return;let next:Bounds|null=null;
   for(const tooltip of document.querySelectorAll<HTMLElement>(selector)){const style=getComputedStyle(tooltip),r=tooltip.getBoundingClientRect();if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||!r.width||!r.height)continue;next={left:r.left,top:r.top,width:r.width,height:r.height,opacity:Number(style.opacity),zIndex:(Number(style.zIndex)||10000)-1,radius:style.borderRadius};}
   setBounds(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);if(next)frame=requestAnimationFrame(read);
  };
  const wake=()=>{if(!frame)frame=requestAnimationFrame(read)};
  const observer=new MutationObserver(records=>{if(records.some(record=>record.target instanceof Element&&(record.target.closest(selector)||[...record.addedNodes].some(node=>node instanceof Element&&(node.matches(selector)||node.querySelector(selector))))))wake()});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});window.addEventListener('scroll',wake,true);wake();
  return()=>{live=false;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',wake,true)};
 },[]);
 useLayoutEffect(()=>{if(bounds)document.dispatchEvent(new Event('up:tooltip-position'))},[bounds]);
 return bounds?<div className="s-tooltip-glass s-liquid" aria-hidden="true" style={{position:'fixed',left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height,opacity:bounds.opacity,zIndex:bounds.zIndex,borderRadius:bounds.radius,pointerEvents:'none'}}><GlassMaterial/></div>:null;
}
