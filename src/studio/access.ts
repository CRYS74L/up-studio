export function isLocalAccess(hostname=location.hostname){
 return ['localhost','127.0.0.1','::1','[::1]'].includes(hostname.toLowerCase());
}
export function canCopyText(){return typeof navigator.clipboard?.writeText==='function'}
