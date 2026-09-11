import {Popover} from './controls';
import {Children,isValidElement,useEffect,useLayoutEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown,Check} from 'lucide-react';
import {AnimatePresence,motion} from 'motion/react';
export function Select({children,value,onChange,...props}:{children:ReactNode;value:any;onChange:(e:any)=>void;'aria-label'?:string;disabled?:boolean}){
 const id=useId(),ref=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),[open,setOpen]=useState(false),[pos,setPos]=useState({top:0,left:0,width:180}),[index,setIndex]=useState(0);
 const options=Children.toArray(children).filter(isValidElement).map((el:any)=>({value:String(el.props.value??el.props.children),label:el.props.children}));
 const selected=options.find(o=>o.value===String(value));
 useLayoutEffect(()=>{const button=ref.current!;const measure=()=>button.style.setProperty('--select-press-x',String(Math.max(.975,1-3/Math.max(1,button.offsetWidth))));measure();const observer=new ResizeObserver(measure);observer.observe(button);return()=>observer.disconnect()},[]);
 const choose=(i:number)=>{if(!options[i])return;onChange({target:{value:options[i].value}});setOpen(false);ref.current?.focus();};
 return <><button {...props} ref={ref} type="button" className="s-select" role="combobox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${index}`:undefined} aria-haspopup="listbox" onClick={()=>{setIndex(Math.max(0,options.findIndex(o=>o.value===String(value))));setOpen(v=>!v);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();setOpen(true);setIndex(i=>e.key==='Home'?0:e.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,i+(e.key==='ArrowDown'?1:-1))));}else if(open&&['Enter',' '].includes(e.key)){e.preventDefault();choose(index);}}}><span>{selected?.label??value}</span><ChevronDown/></button><Popover open={open} close={()=>setOpen(false)} anchor={ref} role="listbox" label={props['aria-label']} width={Math.max(210,ref.current?.offsetWidth??210)}><div className="ui-menu-list s-select-menu" ref={menu} id={id}>{options.map((o,i)=><button type="button" role="option" id={`${id}-${i}`} key={o.value} aria-selected={o.value===String(value)} className={i===index?'focused':''} onMouseEnter={()=>setIndex(i)} onClick={()=>choose(i)}><span>{o.label}</span>{o.value===String(value)&&<Check/>}</button>)}</div></Popover></>;
}
