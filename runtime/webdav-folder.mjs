import {validateProfile,withRemote,runTool} from './cloud-backup-tools.mjs';
/** Breadth-first lookup: only finish after checking every directory at the same depth. */
export async function findShallowestFolder(name,list){
 let level=[''],visited=0;
 for(let depth=0;level.length&&depth<32;depth++){
  const next=[],matches=[];
  for(const parent of level){if(++visited>10000)throw Error('目录数量过多，请填写完整相对路径');
   const rows=await list(parent);
   for(const row of rows){if(!row.IsDir||row.IsLink)continue;const part=row.Name??row.Path;if(typeof part!=='string'||!part||part==='.'||part==='..'||/[\\/\r\n\0]/.test(part))throw Error('WebDAV 返回了无效目录名称');const relative=parent?parent+'/'+part:part;
    if(part===name)matches.push(relative);else next.push(relative);
   }
  }
  if(matches.length>1)throw Error('同一层级存在多个同名文件夹，请填写完整相对路径：'+matches.slice(0,3).join('、'));
  if(matches.length===1)return matches[0];level=next;
 }
 if(level.length)throw Error('目录层级过深，请填写完整相对路径');
 throw Error('未找到该名称的文件夹；若 WebDAV 已限定到目标目录，请填写 /');
}
export async function resolveBackupFolder(tools,vault,profile){
 if(profile.folder==='/'||profile.folder.includes('/'))return profile;
 const root=validateProfile({...profile,folder:'/'});
 const found=await withRemote(tools,vault,root,env=>findShallowestFolder(decodeURIComponent(profile.folder),async parent=>{
  const result=await runTool(tools.rclone,['lsjson','cloud:'+parent,'--dirs-only','--max-depth','1'],{env,timeout:60000});return JSON.parse(result.stdout);
 }));
 // Save the resolved path once; future backups never repeat a name search.
 return {...profile,...validateProfile({...profile,folder:found}),id:profile.id};
}
