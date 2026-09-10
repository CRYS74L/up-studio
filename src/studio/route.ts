import { useEffect,useState } from 'react';
export type StudioRoute={page:string;video:string|null;ids:string[];tab?:string|null};
function read():StudioRoute{const [page,query]=location.hash.slice(1).split('?');const p=new URLSearchParams(query);return {page:page||'overview',video:p.get('video'),tab:p.get('tab'),ids:p.get('ids')?.split(',').filter(Boolean)??[]};}
export function navigate(page:string,params:Record<string,string>={}){const q=new URLSearchParams(params).toString();location.hash=page+(q?'?'+q:'');}
export function useStudioRoute(){const [route,set]=useState(read);useEffect(()=>{const update=()=>{set(read());window.scrollTo({top:0,behavior:'instant'});};addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update);},[]);return route;}
