import {useLayoutEffect,useRef,useState} from 'react';
import {spaceNumbers} from '../typography/spacing';

// Measure native wrapping so Chinese, Latin words and emoji keep their boundaries.
export function ManuscriptTitle({title}:{title:string}){
  const ref=useRef<HTMLSpanElement>(null),[lines,setLines]=useState<[string,string]>([title,'']);
  useLayoutEffect(()=>{
    const element=ref.current!,displayTitle=spaceNumbers(title.trim().replace(/\s+/gu,' '));
    const measure=()=>{
      if(!element.clientWidth)return;
      const probe=document.createElement('span');
      probe.style.cssText='position:absolute;inset:0 auto auto 0;width:100%;display:block;visibility:hidden;white-space:normal;overflow-wrap:anywhere;pointer-events:none';
      probe.setAttribute('aria-hidden','true');probe.textContent=displayTitle;element.append(probe);
      let split=displayTitle.length;
      try{
        const glyphs=Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(displayTitle));
        if(glyphs.length){
          const text=probe.firstChild!,range=document.createRange();
          const center=(index:number)=>{const g=glyphs[index];range.setStart(text,g.index);range.setEnd(text,g.index+g.segment.length);const rect=range.getBoundingClientRect();return rect.top+rect.height/2;};
          const first=center(0),threshold=parseFloat(getComputedStyle(element).lineHeight)/2;
          let low=0,high=glyphs.length;
          while(low<high){const mid=(low+high)>>1;if(center(mid)<first+threshold)low=mid+1;else high=mid;}
          split=glyphs[low]?.index??displayTitle.length;
        }
      }finally{probe.remove();}
      const first=displayTitle.slice(0,split).trimEnd(),second=displayTitle.slice(split).trimStart();
      setLines(previous=>previous[0]===first&&previous[1]===second?previous:[first,second]);
    };
    let live=true;measure();const observer=new ResizeObserver(measure);observer.observe(element);
    void document.fonts.load('500 13px "UP Studio Manuscript"',displayTitle).then(()=>{if(live)measure()}).catch(()=>{});
    return ()=>{live=false;observer.disconnect()};
  },[title]);
  return <h2 aria-label={title}><span ref={ref} className="s-title-link"><span className="s-title-line">{lines[0]}</span><span className="s-title-line s-title-line-last">{lines[1]}</span></span></h2>;
}
