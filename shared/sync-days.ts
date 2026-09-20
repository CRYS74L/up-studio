export const syncDay=(at:Date|string=new Date())=>new Date(new Date(at).getTime()+8*3600000).toISOString().slice(0,10);
export const shiftSyncDay=(day:string,offset:number)=>new Date(Date.parse(day+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
export function syncDayBounds(day:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;
 const start=new Date(day+'T00:00:00+08:00');if(!Number.isFinite(start.getTime())||syncDay(start)!==day)return null;
 return {start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString()};
}
