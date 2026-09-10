import {Component,type ReactNode} from 'react';
type Box={x:number;y:number};
export class ReorderGrid extends Component<{className:string;children:ReactNode}> {
 root:HTMLDivElement|null=null;
 getSnapshotBeforeUpdate(){return new Map([...this.root!.querySelectorAll<HTMLElement>('[data-reorder]')].map(e=>{const r=e.getBoundingClientRect();return [e.dataset.reorder!,{x:r.x,y:r.y}]}));}
 componentDidUpdate(_props:unknown,_state:unknown,before:Map<string,Box>){
  const nodes=[...this.root!.querySelectorAll<HTMLElement>('[data-reorder]')];for(const e of nodes)for(const a of e.getAnimations())a.cancel();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(const e of nodes){const r=e.getBoundingClientRect(),old=before.get(e.dataset.reorder!);const x=old?old.x-r.x:0,y=old?old.y-r.y:8;if(Math.abs(x)+Math.abs(y)<.5)continue;e.animate([{transform:`translate(${x}px,${y}px)`,opacity:old?1:0},{transform:'translate(0,0)',opacity:1}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});}
 }
 componentWillUnmount(){this.root?.querySelectorAll('[data-reorder]').forEach(e=>e.getAnimations().forEach(a=>a.cancel()));}
 render(){return <div ref={e=>{this.root=e}} className={this.props.className}>{this.props.children}</div>}
}
