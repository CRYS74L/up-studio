import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {useLabSettings,type GlassParameters} from '../lab-settings';
import LiquidGlass from './LiquidGlass';
import './glass.css';
export const GLASS_PRESETS={
 demo:{label:'原站卡片演示',description:'在线 User Info Card 的光学参数：100 / 0.5 / 140% / 2。',mode:'standard',displacementScale:100,blurAmount:.5,saturation:140,aberrationIntensity:2,tint:0,shadow:.25,overLight:false},
 'open-source':{label:'原项目默认',description:'原库标准折射、色差与阴影参数，不叠加白色遮罩。',mode:'standard',displacementScale:70,blurAmount:.0625,saturation:140,aberrationIntensity:2,tint:0,shadow:.25,overLight:false},
 clear:{label:'清透按钮',description:'参考原项目按钮示例，保留原按钮的光学参数。',mode:'standard',displacementScale:64,blurAmount:.1,saturation:130,aberrationIntensity:2,tint:0,shadow:.25,overLight:false},
 reading:{label:'轻白阅读',description:'保留折射与边缘光，加入轻薄白色阅读层。',mode:'standard',displacementScale:60,blurAmount:.12,saturation:125,aberrationIntensity:1.2,tint:.18,shadow:.16,overLight:false},
} as const;
export function GlassMaterial(){
 const settings=useLabSettings(),p:GlassParameters=settings.glassParameters??GLASS_PRESETS[settings.glass],ref=useRef<HTMLSpanElement>(null),parent=useRef<HTMLElement|null>(null),[size,setSize]=useState({width:0,height:0,radius:30});
 useLayoutEffect(()=>{const el=ref.current!;parent.current=el.parentElement;const measure=()=>{const r=el.getBoundingClientRect(),radius=parseFloat(getComputedStyle(el.parentElement!).borderTopLeftRadius)||30;setSize(old=>Math.abs(old.width-r.width)<1&&Math.abs(old.height-r.height)<1&&old.radius===radius?old:{width:r.width,height:r.height,radius})};measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()},[]);
 return <span ref={ref} className="s-glass-material" aria-hidden="true" data-material={settings.glass} style={{'--liquid-shadow':p.shadow} as CSSProperties}>
  {size.width>0&&size.height>0&&<LiquidGlass overLight={p.overLight} mode={p.mode} displacementScale={p.displacementScale} blurAmount={p.blurAmount} saturation={p.saturation} aberrationIntensity={p.aberrationIntensity} elasticity={0} cornerRadius={size.radius} padding="0px" mouseContainer={parent} style={{position:'absolute',left:'50%',top:'50%',width:size.width,height:size.height}}><span style={{display:'block',width:size.width,height:size.height}}/></LiquidGlass>}
  <span className="s-glass-shadow"/>
  <span className="s-glass-tint" style={{background:`rgba(255,255,255,${p.tint})`}}/>
 </span>;
}
