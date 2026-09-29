import {Component,Children,type ReactNode} from 'react';
type Box={x:number;y:number};type Props={className:string;children:ReactNode;motionKey?:string};type Snapshot={boxes:Map<string,Box>;ghosts:Map<string,HTMLElement>;layer:HTMLElement};
const keys=(children:ReactNode)=>Children.toArray(children).map((e:any)=>e.key).join('|');
export class ReorderGrid extends Component<Props>{
 root:HTMLDivElement|null=null;layers=new Set<HTMLElement>();
 getSnapshotBeforeUpdate(previous:Props):Snapshot|null{
  if(previous.motionKey===this.props.motionKey&&previous.className===this.props.className&&keys(previous.children)===keys(this.props.children))return null;
  const nodes=[...this.root!.querySelectorAll<HTMLElement>('[data-reorder]')],r=this.root!.getBoundingClientRect(),top=Math.max(0,r.top),layer=document.createElement('div');layer.className=previous.className+' s-reorder-ghost-layer';layer.setAttribute('aria-hidden','true');layer.inert=true;Object.assign(layer.style,{position:'fixed',left:r.left+'px',top:top+'px',width:r.width+'px',height:Math.max(0,Math.min(innerHeight,r.bottom)-top)+'px',overflow:'clip',display:'block',pointerEvents:'none',zIndex:'22',padding:'0',margin:'0'});
  const boxes=new Map<string,Box>(),ghosts=new Map<string,HTMLElement>();
  for(const e of nodes){const box=e.getBoundingClientRect();boxes.set(e.dataset.reorder!,{x:box.x,y:box.y});if(box.bottom<=0||box.top>=innerHeight)continue;const copy=e.cloneNode(true) as HTMLElement;copy.removeAttribute('data-reorder');Object.assign(copy.style,{position:'absolute',left:(box.x-r.left)+'px',top:(box.y-top)+'px',width:box.width+'px',height:box.height+'px',margin:'0',transform:'none',opacity:getComputedStyle(e).opacity});
   const originals=[...e.querySelectorAll('img')],copies=[...copy.querySelectorAll('img')];originals.forEach((img,i)=>{if(!img.complete||!img.naturalWidth||img.dataset.decoded==='false')return;const size=img.getBoundingClientRect(),canvas=document.createElement('canvas'),dpr=Math.min(devicePixelRatio,2);canvas.width=Math.max(1,Math.round(size.width*dpr));canvas.height=Math.max(1,Math.round(size.height*dpr));canvas.className=img.className;canvas.dataset.decoded='true';Object.assign(canvas.style,{width:'100%',height:'100%',display:'block'});canvas.getContext('2d')?.drawImage(img,0,0,canvas.width,canvas.height);copies[i]?.replaceWith(canvas)});ghosts.set(e.dataset.reorder!,copy);
  }return {boxes,ghosts,layer};
 }
 componentDidMount(){if(!document.documentElement.dataset.backGesture)this.animate(null);}
 componentDidUpdate(_props:Props,_state:unknown,before:Snapshot|null){if(before)this.animate(before);}
 animate(before:Snapshot|null){
  if(document.documentElement.dataset.backGesture||document.documentElement.dataset.contentSwitch||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const nodes=[...this.root!.querySelectorAll<HTMLElement>('[data-reorder]')],ids=new Set(nodes.map(e=>e.dataset.reorder));const removed=before?[...before.ghosts].filter(([id])=>!ids.has(id)):[];
  if(before&&removed.length){removed.forEach(([,e])=>before.layer.append(e));document.querySelector('.studio')!.append(before.layer);this.layers.add(before.layer);const exits=removed.map(([,e])=>e.animate([{opacity:Number(e.style.opacity||1),transform:'translateY(0)'},{opacity:0,transform:'translateY(-14px)'}],{duration:150,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'}));void Promise.allSettled(exits.map(a=>a.finished)).then(()=>{before.layer.remove();this.layers.delete(before.layer)})}
  for(const e of nodes)e.getAnimations().forEach(a=>a.cancel());
  nodes.forEach((e,i)=>{const r=e.getBoundingClientRect(),old=before?.boxes.get(e.dataset.reorder!);let x=old?old.x-r.x:0,y=old?old.y-r.y:18;const stationary=Math.abs(x)+Math.abs(y)<.5;if(stationary)y=6;e.animate([{transform:`translate(${x}px,${y}px)`,opacity:old?(stationary?.75:1):0},{transform:'translate(0,0)',opacity:1}],{duration:480,delay:(old?0:removed.length?150:0)+Math.min(i*10,60),fill:'backwards',easing:'cubic-bezier(.2,.8,.2,1)'});});
 }
 componentWillUnmount(){this.layers.forEach(layer=>layer.remove());this.layers.clear();this.root?.querySelectorAll('[data-reorder]').forEach(e=>e.getAnimations().forEach(a=>a.cancel()));}
 render(){return <div ref={e=>{this.root=e}} className={this.props.className}>{this.props.children}</div>}
}
