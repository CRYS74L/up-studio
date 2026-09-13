import type {CSSProperties} from 'react';
export function ChatIcon({name,style}:{name:'compose'|'sidebar'|'sidebar-search'|'plus'|'settings-cog';style?:CSSProperties}){return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style={style}><use href={'/icons/chat-controls.svg#'+name} fill="currentColor"/></svg>}
