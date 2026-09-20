import {syncDay,syncDayBounds} from '../shared/sync-days';
export async function acquisitionHistory(db:D1Database,day:string,now=new Date()){
 const bounds=syncDayBounds(day);if(!bounds)throw new Error('Invalid synchronization date');
 const earliest=await db.prepare('SELECT MIN(started_at) AS first_at FROM acquisition_runs').first<{first_at:string|null}>();
 const rows=(await db.prepare('SELECT id,status,started_at,finished_at,coverage,coverage_json,error_code,timings_json,request_count FROM acquisition_runs WHERE started_at>=? AND started_at<? ORDER BY started_at DESC,id DESC').bind(bounds.start,bounds.end).all()).results;
 return {ok:true,day,today:syncDay(now),firstDay:earliest?.first_at?syncDay(earliest.first_at):null,runs:rows.map((row:any)=>({...row,details:JSON.parse(row.coverage_json||'{}'),timings:JSON.parse(row.timings_json||'{}'),coverage_json:undefined,timings_json:undefined}))};
}
