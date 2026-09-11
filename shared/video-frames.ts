export type FrameIndex={times:number[];columns:number;rows:number;width:number;height:number;images:string[]};
export function decodeFrameTimes(buffer:ArrayBuffer){const view=new DataView(buffer),times:number[]=[];for(let i=2;i+1<view.byteLength;i+=2)times.push(view.getUint16(i,false));return times;}
export function frameAt(index:FrameIndex,time:number){
 if(!index.times.length)return null;
 let at=index.times.findIndex(t=>t>time);at=at<0?index.times.length-1:Math.max(0,at-1);
 const perSheet=index.columns*index.rows,sheet=Math.floor(at/perSheet),cell=at%perSheet;
 if(!index.images[sheet])return null;
 return {time:index.times[at],image:index.images[sheet],x:cell%index.columns*index.width,y:Math.floor(cell/index.columns)*index.height,width:index.width,height:index.height,columns:index.columns,rows:index.rows};
}
