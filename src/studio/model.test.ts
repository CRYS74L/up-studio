import {it,expect} from 'vitest';
import {filterVideos,dailyTrend,valueOf} from './model';
import type {Video} from '../types';
const v={id:'1',bvid:'BVexample',title:'A&B',duration_seconds:90,views:null,metrics:{views:100},published_at:'2026-01-01',dimensions:{trend:{play:{tendency:[{date_key:20260901,total_inc:4},{date_key:20260903,total_inc:0}]}}}} as unknown as Video;
it('searches BV and literal title without HTML encoding',()=>{expect(filterVideos([v],'bvEXAMPLE','全部','最新发布')).toHaveLength(1);expect(filterVideos([v],'A&B','短视频','最新发布')).toHaveLength(1)});
it('does not replace a missing direct metric with a different source',()=>expect(valueOf(v,'views')).toBeNull());
it('preserves real zero trend points and does not fill missing days',()=>expect(dailyTrend(v,'play')).toEqual([{day:'2026-09-01',value:4},{day:'2026-09-03',value:0}]));
