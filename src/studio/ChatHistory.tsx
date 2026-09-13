import {ChatIcon} from './ChatIcon';
import {useState} from 'react';
import {Trash2,Archive,ArchiveRestore,MessageCircle,Search,SquarePen,Settings} from 'lucide-react';
import type {LabSettings} from './lab-settings';
type Session={id:string;title:string;updatedAt:string;busy?:boolean};
export function ChatHistory({layout,visible,onSettings,sessions,active,archived,query,pending,failed,onQuery,onSelect,onNew,onArchive,onToggleArchive}:{layout:LabSettings['chat'];visible:boolean;onSettings:()=>void;sessions:Session[];active:string;archived:boolean;query:string;pending:boolean;failed:boolean;onQuery:(s:string)=>void;onSelect:(s:string)=>void;onNew:()=>void;onArchive:(id:string)=>void;onToggleArchive:()=>void}){
 const [searchOpen,setSearchOpen]=useState(false);
 const search=<label className="ai-history-search"><ChatIcon name="sidebar-search"/><input aria-label="搜索对话" placeholder="搜索对话" value={query} onChange={e=>onQuery(e.target.value)}/></label>;
 return <aside className="s-chat-history" aria-label="对话记录" data-layout={layout} inert={!visible} aria-hidden={!visible}>
  <header className="ai-history-heading"><b>对话</b><button className="ai-icon" aria-label="搜索历史对话" onClick={()=>setSearchOpen(v=>!v)}><ChatIcon name="sidebar-search"/></button></header>
  <div className="ai-history-controls">{(searchOpen||query)&&search}<button className="ai-new-chat" onClick={onNew}><ChatIcon name="compose"/><span>新对话</span></button></div>
  <small className="ai-history-section-title">最近</small><div className="s-chat-history-list">{sessions.map(c=><div className="ai-session-row" key={c.id} data-active={active===c.id}><button aria-pressed={active===c.id} onClick={()=>onSelect(c.id)}>{layout==='top'&&<MessageCircle/>}<span><b>{c.title}</b><small>{new Date(c.updatedAt).toLocaleDateString('zh-CN',{month:'short',day:'numeric'})}</small></span></button><button className="ai-icon" aria-label={'删除对话 '+c.title} disabled={c.busy} onClick={()=>onArchive(c.id)}><Trash2/></button></div>)}{!sessions.length&&!pending&&<div className="ai-history-empty"><MessageCircle/><p>{query?'没有匹配的对话':archived?'暂无归档':'对话会自动保存在这里'}</p></div>}</div>
  <button className="ai-history-settings ai-icon" aria-label="AI模型设置" onClick={onSettings}><ChatIcon name="settings-cog"/></button>{failed&&<p role="alert">记录读取失败</p>}
 </aside>;
}
