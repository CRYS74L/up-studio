export type VisibleViewport={left:number;top:number;width:number;height:number};
export function visibleViewport():VisibleViewport{
 const v=window.visualViewport;
 return {left:v?.offsetLeft??0,top:v?.offsetTop??0,width:v?.width??innerWidth,height:v?.height??innerHeight};
}
export function popoverPosition(anchor:{left:number;top:number;bottom:number},size:{width:number;height:number},v:VisibleViewport,bottomInset=0){
 const pad=12,clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(n,Math.max(min,max)));
 const bottom=v.top+v.height-bottomInset-pad,below=anchor.bottom+6;
 return {left:clamp(anchor.left,v.left+pad,v.left+v.width-size.width-pad),top:clamp(below+size.height<=bottom?below:anchor.top-size.height-6,v.top+pad,bottom-size.height)};
}
