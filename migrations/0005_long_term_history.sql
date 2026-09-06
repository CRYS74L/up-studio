CREATE TABLE IF NOT EXISTS video_trend_points (
 video_id TEXT NOT NULL, type TEXT NOT NULL, window TEXT NOT NULL, date_key INTEGER NOT NULL,
 total_inc REAL NOT NULL, sub_total_inc REAL, source_json TEXT NOT NULL, captured_at TEXT NOT NULL,
 PRIMARY KEY(video_id,type,window,date_key)
);
CREATE TABLE IF NOT EXISTS account_snapshots (
 captured_at TEXT PRIMARY KEY, followers REAL, source_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS account_trends (
 day TEXT PRIMARY KEY, followers REAL, follows REAL, unfollows REAL, views REAL, captured_at TEXT NOT NULL
);
-- Replay every prior snapshot once, in capture order; newer observations win.
INSERT INTO video_trend_points(video_id,type,window,date_key,total_inc,sub_total_inc,source_json,captured_at)
SELECT s.video_id,t.key,w.key,json_extract(p.value,'$.date_key'),json_extract(p.value,'$.total_inc'),json_extract(p.value,'$.sub_total_inc'),p.value,s.captured_at
FROM video_snapshots s,json_each(s.dimensions_json,'$.trend') t,json_each(t.value) w,json_each(w.value) p
WHERE w.key IN ('tendency','last_30_day_tendency','hour_tendency','hour_realtime_tendency')
AND json_type(w.value)='array' AND json_extract(p.value,'$.date_key') IS NOT NULL AND json_extract(p.value,'$.total_inc') IS NOT NULL
ORDER BY s.captured_at
ON CONFLICT(video_id,type,window,date_key) DO UPDATE SET total_inc=excluded.total_inc,sub_total_inc=excluded.sub_total_inc,source_json=excluded.source_json,captured_at=excluded.captured_at
WHERE excluded.captured_at>=video_trend_points.captured_at;
