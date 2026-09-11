import {expect,it} from 'vitest';
import {retentionSeries,lossSeries} from './retention-model';
import {decodeFrameTimes,frameAt} from '../../shared/video-frames';
it('adds the real 100% starting point and aligns peers by duration',()=>{
 const result=retentionSeries({viewerQuit:[{duration_key:10,num:6000},{duration_key:20,num:2000}],peerViewerQuit:[{duration_key:20,num:8000},{duration_key:40,num:-5}],durationInfo:{quit_duration:20,peer_quit_duration:40}});
 expect(result.own.map(p=>p.num)).toEqual([10000,6000,2000]);
 expect(result.peer.map(p=>p.num)).toEqual([10000,8000,0]);
 expect(lossSeries(result.own).map(p=>p.num)).toEqual([4000,4000,2000]);
});
it('does not create retention points when source data is missing',()=>expect(retentionSeries({}).own).toEqual([]));
it('decodes big-endian preview timestamps and resolves sheet boundaries',()=>{
 expect(decodeFrameTimes(new Uint8Array([0,2,0,0,0,10,1,0]).buffer)).toEqual([0,10,256]);
 const frames={times:[0,10,20,30,40],columns:2,rows:2,width:100,height:50,images:['a','b']};
 expect(frameAt(frames,19)).toMatchObject({image:'a',time:10,x:100,y:0});
 expect(frameAt(frames,29)).toMatchObject({image:'a',time:20,x:0,y:50});
 expect(frameAt(frames,99)).toMatchObject({image:'b',time:40,x:0,y:0});
});
