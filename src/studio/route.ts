import { useEffect,useState,useRef } from 'react';
import {transitionPage} from './page-transition';
export type StudioRoute={page:string;video:string|null;ids:string[];tab?:string|null};
function read():StudioRoute{const [page,query]=location.hash.slice(1).split('?');const p=new URLSearchParams(query);return {page:page==='settings'?'analysis':page||'overview',video:p.get('video'),tab:page==='settings'?'ai':p.get('tab'),ids:p.get('ids')?.split(',').filter(Boolean)??[]};}
export function navigate(page:string,params:Record<string,string>={}){const q=new URLSearchParams(params).toString();location.hash=page+(q?'?'+q:'');}
const scrollPositions=new Map<string,number>();
const routeKey=(r:StudioRoute)=>`${r.page}:${r.video??''}:${r.tab??''}`;
export function useStudioRoute(){const [route,set]=useState(read),shown=useRef(route);useEffect(()=>{const previous=history.scrollRestoration;history.scrollRestoration='manual';const update=()=>{const next=read();scrollPositions.set(routeKey(shown.current),scrollY);void transitionPage(()=>{shown.current=next;set(next)},next,()=>window.scrollTo({top:scrollPositions.get(routeKey(next))??0,behavior:'instant'}));};addEventListener('hashchange',update);return()=>{removeEventListener('hashchange',update);history.scrollRestoration=previous};},[]);return route;}
