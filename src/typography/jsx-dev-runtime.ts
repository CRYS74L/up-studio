import {jsxDEV as base} from 'react/jsx-dev-runtime';
import {spacedProps} from './spacing';
export {Fragment} from 'react/jsx-dev-runtime';
export type {JSX} from 'react/jsx-dev-runtime';
export const jsxDEV=(type:any,props:any,...args:any[])=>(base as any)(type,spacedProps(type,props),...args);
