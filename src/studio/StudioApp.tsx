import {useDashboardData} from '../use-dashboard-data';
import {ageLabel} from '../format';
import {useState,useEffect} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MotionConfig,LayoutGroup,AnimatePresence,motion} from 'motion/react';
import {LayoutDashboard,Clapperboard,ChartNoAxesCombined,Database,Settings,Sun,Moon,RefreshCw,Menu,X,Play,ArrowUpRight} from 'lucide-react';
import {applyTheme,getInitialTheme,transitionTheme} from '../theme';
import {useSync} from '../use-sync';

import {Overview} from './Overview';
import {Library} from './Library';
import {Analysis} from './Analysis';
import {Sources} from './Sources';
import {SettingsPage} from './SettingsPage';
import {navigate,useStudioRoute} from './route';
import {spring,Sheet} from './ui';
import {NavButton} from './NavButton';
import {Account} from './Account';
import {SyncButton} from './SyncButton';
import './studio.css';
const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:30000}}});
const pages=[['overview','概览',LayoutDashboard],['videos','稿件',Clapperboard],['analysis','分析',ChartNoAxesCombined],['sources','数据源',Database],['settings','设置',Settings]] as const;
function Studio(){const {summary,videos}=useDashboardData();const route=useStudioRoute(),[theme,setTheme]=useState(getInitialTheme),[menu,setMenu]=useState(false),sync=useSync();const page=route.page==='matrix'?'analysis':route.page;useEffect(()=>applyTheme(getInitialTheme()),[]);
  useEffect(()=>setMenu(false),[route.page,route.video]);
  const titles:Record<string,string>={overview:'创作概览',videos:route.video?'稿件详情':'我的稿件',analysis:'联合分析',sources:'数据源',settings:'设置'};
  const subtitles:Record<string,string>={overview:'看见内容的表现，也看见下一步方向。',videos:route.video?'回到作品本身，读懂每一次反馈。':'每一份创作，都值得被认真看见。',analysis:'从一个问题开始，让数据给你线索。',sources:'让连接、同步与数据状态一目了然。',settings:'管理你的服务连接与本地数据。'};

  useEffect(()=>{if(!sync.data&&!sync.error)return;const timer=setTimeout(()=>sync.reset(),sync.error?6500:3500);return()=>clearTimeout(timer)},[sync.data,sync.error]);
  function go(p:string){navigate(p);setMenu(false);}
  return <MotionConfig reducedMotion="user" transition={spring}><LayoutGroup><div className={`studio ${menu?'nav-open':''}`}>
    <AnimatePresence>{menu&&<motion.button key="scrim" className="s-nav-scrim" aria-label="关闭导航" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setMenu(false)}/>}</AnimatePresence>
    <aside className="s-sidebar"><div className="s-brand"><img className="s-brand-logo" src="/brand/up-mark.svg" alt=""/><div><b>UP Studio</b></div></div><nav aria-label="主导航">{pages.map(([id,label])=><NavButton key={id} id={id} label={label} active={page===id} onClick={()=>go(id)}>{page===id&&<motion.span layoutId="nav-selection" className="s-nav-selection" transition={spring}/>}</NavButton>)}</nav><Account/></aside>
    <main className="s-main"><header className="s-header"><div><h1>{titles[page]??'创作概览'}</h1></div><div className="s-header-actions">{summary?.configured&&<span className="s-header-freshness">最近同步 · {ageLabel(summary.freshnessMinutes)}</span>}<button className="s-icon" aria-label="切换深浅色" onClick={()=>{const next=theme==='dark'?'light':'dark';setTheme(next);void transitionTheme(next);}}>{theme==='dark'?<Moon/>:<Sun/>}</button><SyncButton pending={sync.isPending} onClick={()=>sync.mutate()}/><button className="s-icon s-menu-toggle" aria-label="打开导航" aria-expanded={menu} onClick={()=>setMenu(!menu)}><Menu/></button></div></header>
    <AnimatePresence>{(sync.data||sync.error)&&<motion.div className={`s-toast s-floating-toast ${sync.error?'error':''}`} role="status" initial={{opacity:0,y:-16,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12,scale:.98}} transition={{duration:.2}}><span>{sync.error?.message??(sync.data?.status==='partial'?'同步完成，部分数据待更新':sync.data?.status==='skipped'?'正在同步中':'同步完成')}</span></motion.div>}</AnimatePresence>
    <AnimatePresence mode="wait" initial={false}><motion.div className="s-page" key={page+':'+(route.video??'')+(page==='settings'?location.hash:'')} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-3}} transition={{duration:.28,ease:[.22,1,.36,1]}}>{page==='videos'?<Library route={route}/>:page==='analysis'?<Analysis route={route}/>:page==='sources'?<Sources/>:page==='settings'?<SettingsPage/>:<Overview/>}</motion.div></AnimatePresence></main>
    <nav className="s-mobile-nav" aria-label="移动导航">{pages.map(([id,label,Icon])=><button key={id} aria-current={page===id?'page':undefined} onClick={()=>go(id)}>{page===id&&<motion.span className="s-nav-selection" layoutId="mobile-selection"/>}<Icon/><span>{label}</span></button>)}</nav>
  </div></LayoutGroup></MotionConfig>;
}
export function StudioApp(){return <QueryClientProvider client={client}><Studio/></QueryClientProvider>;}
