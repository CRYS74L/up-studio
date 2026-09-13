import {Archive,ArchiveRestore,MessageCircle,Search,SquarePen} from 'lucide-react';
import type {LabSettings} from './lab-settings';
type Session={id:string;title:string;updatedAt:string;busy?:boolean};
export function ChatHistory({layout,sessions,active,archived,query,pending,failed,onQuery,onSelect,onNew,onArchive,onToggleArchive}:{layout:LabSettings['chat'];sessions:Session[];active:string;archived:boolean;query:string;pending:boolean;failed:boolean;onQuery:(s:string)=>void;onSelect:(s:string)=>void;onNew:()=>void;onArchive:(id:string)=>void;onToggleArchive:()=>void}){
 const search=<label className="ai-history-search"><Search/><input aria-label="搜索对话" placeholder="搜索对话" value={query} onChange={e=>onQuery(e.target.value)}/></label>;
 return <aside className="s-chat-history" aria-label="对话记录" data-layout={layout}>
  <header className="ai-history-heading"><b>{archived?'已归档':'最近对话'}</b><button className="ai-icon" aria-label="查看归档对话" aria-pressed={archived} onClick={onToggleArchive}><Archive/></button></header>
  <div className="ai-history-controls">{search}<button className="ai-new-chat" onClick={onNew}><SquarePen/><span>新对话</span></button></div>
  <div className="s-chat-history-list">{sessions.map(c=><div className="ai-session-row" key={c.id} data-active={active===c.id}><button aria-pressed={active===c.id} onClick={()=>onSelect(c.id)}>{layout==='top'&&<MessageCircle/>}<span><b>{c.title}</b><small>{new Date(c.updatedAt).toLocaleDateString('zh-CN',{month:'short',day:'numeric'})}</small></span></button><button className="ai-icon" aria-label={(archived?'恢复对话 ':'归档对话 ')+c.title} disabled={c.busy} onClick={()=>onArchive(c.id)}>{archived?<ArchiveRestore/>:<Archive/>}</button></div>)}{!sessions.length&&!pending&&<div className="ai-history-empty"><MessageCircle/><p>{query?'没有匹配的对话':archived?'暂无归档':'对话会自动保存在这里'}</p></div>}</div>
  {failed&&<p role="alert">记录读取失败</p>}
 </aside>;
}
