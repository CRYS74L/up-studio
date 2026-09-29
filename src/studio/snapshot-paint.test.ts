// @vitest-environment jsdom
import {expect,it} from 'vitest';
import {preserveControlPaint,shadowRootSelectors} from './snapshot-paint';
import {backGestureCompletes} from './back-gesture';
it('preserves explicit transparent button paint in inert snapshots',()=>{const source=document.createElement('div');source.innerHTML='<button style="background-color:transparent;color:rgb(20,20,20)">Nav</button>';document.body.append(source);const copy=source.cloneNode(true) as HTMLElement;preserveControlPaint(source,copy);const button=copy.querySelector('button')!;expect(button.style.backgroundColor).toBe('rgba(0, 0, 0, 0)');expect(button.style.getPropertyPriority('background-color')).toBe('important');expect(button.style.appearance).toBe('none');source.remove()});
it('retains theme conditions in shadow selectors',()=>expect(shadowRootSelectors(':root[data-theme=dark] button{}')).toBe(':host([data-theme=dark]) button{}'));
it('requires sufficient drag or a deliberate flick to finish returning',()=>{expect(backGestureCompletes(10,390,1)).toBe(false);expect(backGestureCompletes(70,390,0)).toBe(false);expect(backGestureCompletes(140,390,0)).toBe(true);expect(backGestureCompletes(60,390,.8)).toBe(true)});
