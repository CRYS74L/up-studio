// @vitest-environment jsdom
import {createElement} from 'react';
import {render,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ReorderGrid} from './ReorderGrid';
import {clonePresentation} from './clone-presentation';
afterEach(()=>{cleanup();delete document.documentElement.dataset.backGesture;vi.unstubAllGlobals();vi.restoreAllMocks()});
it('does not replay list entrance while revealing a parent during back gesture',()=>{document.documentElement.dataset.backGesture='true';vi.stubGlobal('matchMedia',()=>({matches:false}));Object.defineProperty(Element.prototype,'getAnimations',{configurable:true,value:()=>[]});const animate=vi.fn();vi.stubGlobal('innerHeight',844);Object.defineProperty(Element.prototype,'animate',{configurable:true,value:animate});render(createElement(ReorderGrid,{className:'grid',children:createElement('div',{'data-reorder':'v'},'Video')}));expect(animate).not.toHaveBeenCalled()});
it('remaps SVG identity without losing clip references or entering a new style scope',()=>{const source=document.createElement('div');source.innerHTML='<svg><defs><clipPath id="clip"><rect width="20"/></clipPath></defs><g clip-path="url(#clip)"><rect/></g><use href="#clip"/></svg>';const copy=clonePresentation(source),id=copy.querySelector('clipPath')!.id;expect(id).not.toBe('clip');expect(copy.querySelector('g')!.getAttribute('clip-path')).toBe(`url(#${id})`);expect(copy.querySelector('use')!.getAttribute('href')).toBe('#'+id);expect(copy.shadowRoot).toBeNull()});


