import {FreshnessAge} from './FreshnessAge';
import {GlassMaterial} from './glass/GlassMaterial';
import {DesignLab} from './DesignLab';
import {useLabSettings,applyLabSettings} from './lab-settings';
import {FlaskConical} from 'lucide-react';
import {warmSnapshotStyles} from './page-snapshot';
import {client} from './query-client';
import {chartFont,loadFonts} from '../fonts';
import {ThemeSwitch,BackToTop} from './ShellControls';
import {useDashboardData} from '../use-dashboard-data';
import {warmCover} from './cover-loading';
import {coverSrc,ageLabel} from '../format';
import {useState,useEffect,useLayoutEffect} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MotionConfig,LayoutGroup,AnimatePresence,motion} from 'motion/react';
import {LayoutDashboard,SquarePlay,ChartNoAxesCombined,DatabaseZap,Settings,Sun,Moon,RefreshCw,Menu,X,Play,ArrowUpRight} from 'lucide-react';
import {applyTheme,getInitialTheme,transitionTheme} from '../theme';
import {useSync} from '../use-sync';

import {Overview} from './Overview';
import {Library} from './Library';
import {Analysis} from './Analysis';
import {Sources} from './Sources';

import {navigate,useStudioRoute} from './route';
import {spring,Sheet} from './ui';
import {NavButton,NavSelection} from './NavButton';
import {Account,Brand} from './Account';
import './studio.css';
const pages=[['overview','概览',LayoutDashboard],['videos','稿件',SquarePlay],['analysis','分析',ChartNoAxesCombined],['sources','数据源',DatabaseZap]] as const;
function Studio(){const lab=useLabSettings(),[labOpen,setLabOpen]=useState(false);useLayoutEffect(()=>applyLabSettings(lab),[lab]);const {summary,videos}=useDashboardData();const route=useStudioRoute(),[theme,setTheme]=useState(getInitialTheme),[menu,setMenu]=useState(false),sync=useSync();const page=route.page==='matrix'?'analysis':route.page;useEffect(()=>{applyTheme(getInitialTheme());void loadFonts(chartFont).catch(()=>{});const idle=globalThis.requestIdleCallback?.(()=>warmSnapshotStyles());return()=>{if(idle!=null)cancelIdleCallback(idle)}},[]);
  useEffect(()=>{if(!videos.length)return;const warm=()=>{videos.slice(0,6).forEach(v=>void warmCover(coverSrc(v,'card')));videos.slice(0,12).forEach(v=>void warmCover(coverSrc(v,'preview')))};const idle=globalThis.requestIdleCallback?.(warm,{timeout:2000});if(idle==null){const timer=setTimeout(warm,300);return()=>clearTimeout(timer)}return()=>cancelIdleCallback(idle)},[videos.map(v=>v.id).join(',')]);
  useEffect(()=>setMenu(false),[route.page,route.video]);
  const titles:Record<string,string>={overview:'创作概览',videos:route.video?'稿件详情':'我的稿件',analysis:'联合分析',sources:'数据源',settings:'设置'};
  const subtitles:Record<string,string>={overview:'看见内容的表现，也看见下一步方向。',videos:route.video?'回到作品本身，读懂每一次反馈。':'每一份创作，都值得被认真看见。',analysis:'从一个问题开始，让数据给你线索。',sources:'让连接、同步与数据状态一目了然。',settings:'管理你的服务连接与本地数据。'};

  useEffect(()=>{if(!sync.data&&!sync.error)return;const timer=setTimeout(()=>sync.reset(),sync.error?6500:3500);return()=>clearTimeout(timer)},[sync.data,sync.error]);
  function go(p:string){navigate(p);setMenu(false);}
  return <MotionConfig reducedMotion="user" transition={spring}><LayoutGroup><div className={`studio ${menu?'nav-open':''}`}>
    <aside className="s-sidebar s-liquid"><GlassMaterial sidebar/><Brand/><nav aria-label="主导航"><NavSelection page={page}/>{pages.map(([id,label])=><NavButton key={id} id={id} label={label} active={page===id} onClick={()=>go(id)}></NavButton>)}</nav><button className="s-design-entry" onClick={()=>setLabOpen(true)}><FlaskConical/><span>界面试验</span><small>临时</small></button><Account/></aside>
    <main className="s-main"><header className="s-header"><div><h1>{titles[page]??'创作概览'}</h1></div><div className="s-header-actions">{summary?.configured&&<span className="s-header-freshness">最近同步 · <FreshnessAge capturedAt={summary.summary.fresh} fallback={summary.freshnessMinutes}/></span>}<button className="s-lab-mobile s-icon" aria-label="界面试验" onClick={()=>setLabOpen(true)}><FlaskConical/></button><ThemeSwitch value={theme} onChange={(next,origin)=>{void transitionTheme(next,origin,()=>setTheme(next))}}/></div></header>
    <AnimatePresence>{(sync.data||sync.error)&&<motion.div className={`s-toast s-floating-toast s-liquid ${sync.error?'error':''}`} role="status" initial={{opacity:0,y:-16,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12,scale:.98}} transition={{type:'tween',duration:.2}}><GlassMaterial/><span>{sync.error?.message??(sync.data?.status==='partial'?'同步完成，部分数据待更新':sync.data?.status==='skipped'?'正在同步中':'同步完成')}</span></motion.div>}</AnimatePresence>
    <div className="s-page" key={page+':'+(route.video??'')+(page==='settings'?location.hash:'')}>{page==='videos'?<Library route={route}/>:page==='analysis'?<Analysis route={route}/>:page==='sources'?<Sources sync={sync}/>:<Overview/>}</div></main><BackToTop/>
    <div className="s-mobile-dock"><nav className="s-mobile-nav s-liquid" aria-label="移动导航"><GlassMaterial/><NavSelection page={page}/>{pages.map(([id,label])=><NavButton key={id} id={id} label={label} active={page===id} onClick={()=>go(id)}></NavButton>)}</nav></div>
  <AnimatePresence>{labOpen&&<DesignLab close={()=>setLabOpen(false)}/>}</AnimatePresence></div></LayoutGroup></MotionConfig>;
}
export function StudioApp(){return <QueryClientProvider client={client}><Studio/></QueryClientProvider>;}
