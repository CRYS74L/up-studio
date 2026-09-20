export function syncSlots(width:number,total:number,page:number){
 const capacity=Math.max(1,Math.floor((width+2.34)/7.34));
 const pages=Math.max(1,Math.ceil(total/capacity)),current=Math.min(page,pages-1);
 const count=Math.min(capacity,Math.max(0,total-current*capacity));
 const step=capacity>1?(width-5)/(capacity-1):0;
 return {capacity,pages,current,count,step,offset:pages===1&&count?Math.max(0,(width-((count-1)*step+5))/2):(capacity-count)*step};
}
export function incomingSlots(before:string[],after:string[]){
 const index=after.indexOf(before.at(-1)??'');
 return index<0?0:after.length-1-index;
}
