type Point={duration_key:number;num:number};
export function retentionSeries(raw:any){
 const normalize=(points:Point[])=>points?.length?[{duration_key:0,num:10000},...points.map(p=>({...p,num:Math.floor(Math.max(0,p.num)||0)}))]:[];
 const own=normalize(raw?.viewerQuit??[]),peer=normalize(raw?.peerViewerQuit??[]),selfDuration=raw?.durationInfo?.quit_duration,peerDuration=raw?.durationInfo?.peer_quit_duration;
 if(!own.length||!peer.length||!selfDuration||!peerDuration||selfDuration===peerDuration)return {own,peer};
 const scaled=peer.map(p=>({...p,duration_key:p.duration_key*selfDuration/peerDuration}));
 return {own,peer:own.map(p=>{const i=scaled.findIndex((q,j)=>j>0&&q.duration_key>=p.duration_key&&scaled[j-1].duration_key<=p.duration_key);if(i<1)return {...p,num:0};const a=scaled[i-1],b=scaled[i],ratio=(p.duration_key-a.duration_key)/(b.duration_key-a.duration_key);return {...p,num:Math.floor(a.num+(b.num-a.num)*ratio)}})};
}
export const lossSeries=(points:Point[])=>points.map((p,i)=>({...p,num:p.num-(points[i+1]?.num??0)}));
