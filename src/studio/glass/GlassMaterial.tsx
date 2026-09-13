import {useId,useLayoutEffect,useRef,useState} from 'react';
import {useLabSettings} from '../lab-settings';
import {GlassFilter} from './GlassFilter';
import './glass.css';
export const GLASS_PRESETS={
 reading:{mode:'standard',label:'柔白折射',description:'轻折射与乳白阅读层，适合复杂背景。',scale:18,tint:.72,blur:2,saturation:115},
 clear:{mode:'polar',label:'清透折射',description:'更透亮的背景和弧面边缘，保留少量白色遮罩。',scale:24,tint:.48,blur:1.5,saturation:120},
 'open-source':{mode:'prominent',label:'弧面透镜',description:'更明显的边缘弯曲，中央内容保持清晰。',scale:32,tint:.6,blur:1.8,saturation:110},
} as const;
/** One material plane shared by Dock, toast, version capsule and back-to-top. */
export function GlassMaterial(){
 const {glass}=useLabSettings(),p=GLASS_PRESETS[glass==='demo'?'open-source':glass],id='liquid-'+useId().replace(/:/g,''),ref=useRef<HTMLSpanElement>(null),[size,setSize]=useState({width:300,height:60});
 useLayoutEffect(()=>{const el=ref.current!;const observer=new ResizeObserver(([entry])=>{const {width,height}=entry.contentRect;setSize(old=>Math.abs(old.width-width)<1&&Math.abs(old.height-height)<1?old:{width,height})});observer.observe(el);return()=>observer.disconnect()},[]);
 return <span ref={ref} className="s-glass-material" aria-hidden="true" data-material={glass}>
  <GlassFilter id={id} mode={p.mode} displacementScale={Math.min(p.scale,size.height*.4)} aberrationIntensity={.25} width={size.width} height={size.height}/>
  <span className="s-glass-optics" style={{filter:`url(#${id})`,backdropFilter:`blur(${p.blur}px) saturate(${p.saturation}%)`}}/>
  <span className="s-glass-tint" style={{background:`rgba(255,255,255,${p.tint})`}}/>
 </span>;
}
