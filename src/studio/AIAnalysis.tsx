import {useEffect,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {ArrowUp,Square,Plus,MessageSquare,Settings,Copy,PanelLeftClose,PanelLeftOpen,Paperclip} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {request} from '../format';
import type {Video} from '../types';
import {modelLabel,supportsVision} from '../../shared/ai-models';
import {navigate} from './route';
import {ManuscriptPicker} from './ManuscriptPicker';
import {AnimatePresence} from './ui';

type Message={id:string;role:'user'|'assistant';content:string;status?:string;error?:string;model?:string;createdAt:string};
type Conversation={id:string;title:string;messages:Message[];videoIds:string[];busy:boolean};
const controllers=new Map<string,AbortController>();
const read=(key:string)=>{try{return localStorage.getItem(key)||''}catch{return ''}};
const write=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{}};
export function AIAnalysis({videos}:{videos:Video[]}){
 const client=useQueryClient(),profile=useQuery({queryKey:['account-profile'],queryFn:()=>request<any>('/api/account/profile')});
 const owner=profile.data?.profile?.uid??'local';
 const [active,setActive]=useState(''),[draft,setDraft]=useState(''),[scope,setScope]=useState<string[]|null>(null),[picker,setPicker]=useState(false),[covers,setCovers]=useState(false),[historyOpen,setHistoryOpen]=useState(false),[sending,setSending]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState('');
 const scroll=useRef<HTMLDivElement>(null),stick=useRef(true),input=useRef<HTMLTextAreaElement>(null),generation=useRef(0);
 const select=(id:string)=>{generation.current++;setActive(id);write('up-ai-active:'+owner,id);setScope(null);setHistoryOpen(false);setError('');stick.current=true;};
 useEffect(()=>{setActive(read('up-ai-active:'+owner));setScope(null);setError('')},[owner]);
 useEffect(()=>{setDraft(read(`up-ai-draft:${owner}:${active}`))},[owner,active]);
 const status=useQuery({queryKey:['ai-status'],queryFn:()=>request<any>('/api/ai/status')});
 const history=useQuery({queryKey:['ai-conversations',owner],queryFn:()=>request<any>('/api/ai/conversations'),refetchInterval:5000});
 const conversation=useQuery({queryKey:['ai-conversation',owner,active],queryFn:()=>request<{conversation:Conversation}>('/api/ai/conversations/'+encodeURIComponent(active)),enabled:!!active,staleTime:Infinity,refetchInterval:q=>q.state.data?.conversation.busy&&!controllers.has(owner+':'+active)?2500:false});
 const current=conversation.data?.conversation,messages=current?.messages??[],ids=scope??current?.videoIds??videos.map(v=>v.id),busy=!!current?.busy||(sending&&!active);
 useEffect(()=>{if(stick.current&&scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;},[messages,messages.at(-1)?.content,busy]);
 useEffect(()=>{if(input.current){input.current.style.height='auto';input.current.style.height=Math.min(160,input.current.scrollHeight)+'px'}},[draft]);
 async function send(text=draft){
   if(!text.trim()||busy||sending)return;
   if(!status.data?.configured){navigate('settings',{tab:'ai'});return;}
   setSending(true);setError('');stick.current=true;const token=++generation.current,controller=new AbortController();let id=active;
   const cache=(value:Conversation)=>client.setQueryData(['ai-conversation',owner,value.id],{ok:true,conversation:value});
   try{
     const response=await fetch('/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({conversationId:active||undefined,message:text,ids,includeCovers:covers}),signal:controller.signal});
     if(!response.ok){const body=await response.json();throw Error(body.error?.message??'发送失败')}
     if(!response.body)throw Error('没有收到回复');
     setDraft('');write(`up-ai-draft:${owner}:${active}`,'');
     const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',event='',value:Conversation|undefined;
     while(true){const next=await reader.read();if(next.done)break;buffer+=decoder.decode(next.value,{stream:true});let boundary;
       while((boundary=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);let data='';for(const line of block.split('\n')){if(line.startsWith('event:'))event=line.slice(6).trim();if(line.startsWith('data:'))data+=line.slice(5).trim();}if(!data)continue;const payload=JSON.parse(data);
         if(event==='conversation'){id=payload.id;controllers.set(owner+':'+id,controller);value={...payload,busy:true};cache(value!);if(token===generation.current){setActive(id);write('up-ai-active:'+owner,id);}void client.invalidateQueries({queryKey:['ai-conversations',owner]});}
         if(event==='delta'&&value){value={...value,messages:value.messages.map((m,i)=>i===value!.messages.length-1?{...m,content:m.content+payload.text}:m)};cache(value);}
         if(event==='done'){value=payload.conversation;cache(value!);}
       }
     }
   }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}
   finally{controllers.delete(owner+':'+id);setSending(false);void client.invalidateQueries({queryKey:['ai-conversations',owner]});if(id)void client.invalidateQueries({queryKey:['ai-conversation',owner,id]});}
 }
 const copy=async(m:Message)=>{try{await navigator.clipboard.writeText(m.content);setCopied(m.id);setTimeout(()=>setCopied(''),1800)}catch{setError('复制失败，请手动选择文字。')}};
 return <div className={'s-chat '+(historyOpen?'history-open':'')}>
   <aside className="s-chat-history" aria-label="对话记录"><button className="s-secondary" onClick={()=>select('')}><Plus/> 新对话</button><div className="s-chat-history-list">{history.data?.conversations?.map((c:any)=><button key={c.id} aria-pressed={active===c.id} onClick={()=>select(c.id)}><MessageSquare/><span><b>{c.title}</b><small>{new Date(c.updatedAt).toLocaleDateString('zh-CN')}</small></span></button>)}</div>{history.error&&<p role="alert">记录读取失败</p>}</aside>
   <section className="s-chat-main"><header className="s-chat-header"><button className="s-icon" aria-label="切换对话记录" aria-expanded={historyOpen} onClick={()=>setHistoryOpen(v=>!v)}>{historyOpen?<PanelLeftClose/>:<PanelLeftOpen/>}</button><div><b>{current?.title??'AI 创作对话'}</b><small>{modelLabel(status.data?.model)}</small></div><button className="s-icon" aria-label="AI模型设置" onClick={()=>navigate('settings',{tab:'ai'})}><Settings/></button></header>
    <div className="s-chat-messages" ref={scroll} onScroll={()=>{const el=scroll.current!;stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<90}}>
     {!active&&!messages.length&&<div className="s-chat-welcome"><img src="/brand/up-mark.svg" alt=""/><h2>想了解哪些创作数据？</h2><div>{['最近哪些内容值得延续？','帮我分析观看流失的原因','给下一篇视频设计一个验证实验'].map(q=><button className="s-secondary" key={q} onClick={()=>{setDraft(q);input.current?.focus()}}>{q}</button>)}</div></div>}
     {conversation.isPending&&active&&<p role="status">读取对话…</p>}{conversation.error&&<p role="alert">{conversation.error.message}</p>}
     {messages.map(m=><article key={m.id} className={'s-chat-message '+m.role} aria-label={m.role==='user'?'你的消息':'AI回复'}><div className="s-chat-message-body">{m.role==='user'?<p>{m.content}</p>:<Markdown remarkPlugins={[remarkGfm]} components={{img:()=>null,a:({href,children})=><a href={href} target={href?.startsWith('/#')?undefined:'_blank'} rel="noreferrer">{children}</a>}}>{m.content}</Markdown>}{m.status==='pending'&&!m.content&&<span className="s-chat-thinking" role="status">正在思考<span>…</span></span>}{m.error&&<p className="s-chat-message-state">{m.error}</p>}</div>{m.role==='assistant'&&m.content&&<button className="s-text" onClick={()=>void copy(m)}><Copy/>{copied===m.id?'已复制':'复制'}</button>}</article>)}
    </div>
    <footer className="s-chat-footer">{error&&<p className="s-error" role="alert">{error}</p>}<div className="s-chat-compose"><textarea ref={input} aria-label="AI对话消息" rows={2} placeholder={status.data?.configured?'聊聊你的创作，Enter 发送，Shift + Enter 换行':'先配置 DeepSeek，再开始对话'} value={draft} maxLength={4000} onChange={e=>{setDraft(e.target.value);write(`up-ai-draft:${owner}:${active}`,e.target.value)}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send()}}}/><div className="s-chat-compose-tools"><button className="s-text" onClick={()=>setPicker(true)}><Paperclip/>{ids.length} 篇稿件</button>{supportsVision(status.data?.model)&&<label><input type="checkbox" checked={covers} onChange={e=>setCovers(e.target.checked)}/>附带封面</label>}{busy?<button className="s-icon" aria-label="停止生成" disabled={!controllers.has(owner+':'+active)} onClick={()=>controllers.get(owner+':'+active)?.abort()}><Square/></button>:<button className="s-primary s-chat-send" aria-label={status.data?.configured?'发送消息':'配置DeepSeek'} disabled={sending||((!draft.trim()||!ids.length)&&status.data?.configured)} onClick={()=>void send(status.data?.configured?draft:'开始分析')}><ArrowUp/></button>}</div></div></footer>
   </section><AnimatePresence>{picker&&<ManuscriptPicker videos={videos} selected={ids} onChange={setScope} close={()=>setPicker(false)}/>}</AnimatePresence>
 </div>;
}
