// @vitest-environment jsdom
import {createElement} from 'react';
import {render,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {GlassMaterial} from './GlassMaterial';
vi.mock('../lab-settings',()=>({useLabSettings:()=>({glass:'open-source'})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()});
for(const [engine,ua,touch] of [['Chromium','Mozilla Chrome/130.0',false],['Safari','Mozilla Version/26 Safari/605',true],['Firefox','Mozilla Firefox/153',false]] as const){
 it(`${engine} samples the real surface and cleans up on unmount`,()=>{
  vi.spyOn(navigator,'userAgent','get').mockReturnValue(ua);
  vi.stubGlobal('CSS',{supports:()=>touch});
  vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
  const host=document.createElement('div');host.className='s-liquid';document.body.append(host);
  const view=render(createElement(GlassMaterial,{}),{container:host});
  expect(host.dataset.nativeGlass).toBe('true');
  expect(host.style.getPropertyValue('--native-glass-effect')).toContain('blur(1.8px)');
  expect(host.style.getPropertyValue('--native-glass-effect').includes('url(')).toBe(engine==='Chromium');
  expect(host.querySelector('.s-sidebar-painted-backdrop')).toBeNull();
  view.unmount();expect(host.dataset.nativeGlass).toBeUndefined();expect(host.style.getPropertyValue('--native-glass-effect')).toBe('');host.remove();
 });
}
