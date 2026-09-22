import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile);
export async function prepareLanFirewall({program,port,action='Ensure',runner=run,platform=process.platform}){
 if(platform!=='win32')return{ready:true,managed:false};
 try{const {stdout}=await runner(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(import.meta.dirname,'lan-firewall.ps1'),'-Action',action,'-Program',program,'-Port',String(port)],{windowsHide:true,encoding:'utf8',timeout:150000});const result=JSON.parse(stdout.replace(/^\uFEFF/,'').trim());if(!result.ready&&action==='Ensure')throw Error('not-ready');return result}catch{throw Error('未能完成 Windows 防火墙配置。请在系统权限提示中允许此操作；如已取消，请重新打开开关。')}
}
