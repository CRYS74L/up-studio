/** ECharts expects chart-local coordinates even when its HTML lives in body. */
export function tooltipPosition(point:number[],chart:{left:number;top:number},size:{width:number;height:number},viewport:{width:number;height:number;left?:number;top?:number},bottomInset=0){
 const left=viewport.left??0,top=viewport.top??0,pad=12;
 const x=chart.left+point[0],y=chart.top+point[1];
 const maxX=left+viewport.width-size.width-pad,maxY=top+viewport.height-bottomInset-size.height-pad;
 const above=y-size.height-14;
 return [Math.max(left+pad,Math.min(x+14,maxX))-chart.left,Math.max(top+pad,Math.min(above>=top+pad?above:y+14,maxY))-chart.top];
}
