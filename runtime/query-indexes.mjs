// Existing account tables keep the same rows; only their lookup paths change.
export function ensureScopedQueryIndexes(database){
 const columns={video_snapshots:'captured_at DESC,source',account_snapshots:'captured_at DESC',acquisition_runs:'started_at DESC'};
 for(const {name} of database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()){
  const match=/^up_\d+_(video_snapshots|account_snapshots|acquisition_runs)$/.exec(name);
  if(match)database.exec(`CREATE INDEX IF NOT EXISTS ${name}_dashboard_lookup ON ${name}(${columns[match[1]]})`);
 }
}
