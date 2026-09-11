import {jsx as baseJsx,jsxs as baseJsxs} from 'react/jsx-runtime';
import {spacedProps} from './spacing';
export {Fragment} from 'react/jsx-runtime';
export type {JSX} from 'react/jsx-runtime';
export const jsx=(type:any,props:any,key?:any)=>baseJsx(type,spacedProps(type,props),key);
export const jsxs=(type:any,props:any,key?:any)=>baseJsxs(type,spacedProps(type,props),key);
