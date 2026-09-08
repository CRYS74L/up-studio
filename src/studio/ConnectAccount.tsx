import {useEffect,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import QRCode from 'qrcode';
import {request} from '../format';
export function ConnectAccount({done}:{done:()=>void}){
 const client=useQueryClient(),[qr,setQr]=useState<{key:string;image:string}|null>(null),[error,setError]=useState(''),[state,setState]=useState('waiting');
 async function start(){setError('');setQr(null);setState('waiting');try{const r=await request<{key:string;url:string}>('/api/bilibili/qr/start',{method:'POST'});setQr({key:r.key,image:await QRCode.toDataURL(r.url,{width:250,margin:1})});}catch(e){setError((e as Error).message)}}
 useEffect(()=>{void start()},[]);
 useEffect(()=>{if(!qr)return;let live=true;let timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const r=await request<{state:string}>(`/api/bilibili/qr/status/${qr.key}`);if(!live)return;setState(r.state);if(r.state==='confirmed'){await client.invalidateQueries();done();}else if(r.state==='waiting'||r.state==='scanned')timer=setTimeout(poll,1800);}catch(e){if(live)setError((e as Error).message)}};timer=setTimeout(poll,1800);return()=>{live=false;clearTimeout(timer)}},[qr]);
 return <div className="s-account-connect"><h3>连接其他 UP 主</h3>{qr?<img src={qr.image} alt="B站账号登录二维码"/>:!error&&<p role="status">生成二维码…</p>}<p>{state==='scanned'?'已扫码，请在手机确认':state==='expired'?'二维码已过期':'使用目标账号的哔哩哔哩 App 扫码'}</p>{(error||state==='expired')&&<button className="s-secondary" onClick={start}>重新获取二维码</button>}{error&&<p role="alert" className="s-error">{error}</p>}</div>;
}
