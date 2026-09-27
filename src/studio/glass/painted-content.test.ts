// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {paintedContentSync} from './painted-content';
it('copies nested scroll offsets and canvas pixels and follows later scrolling',()=>{
 const source=document.createElement('div');source.innerHTML='<div><canvas width="40" height="20"></canvas></div>';
 const scroller=source.firstElementChild as HTMLElement;scroller.scrollLeft=45;scroller.scrollTop=20;
 const copy=source.cloneNode(true) as HTMLElement,drawImage=vi.fn();const mock=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage} as any);
 const sync=paintedContentSync(source,copy);sync();expect(copy.firstElementChild!.scrollLeft).toBe(45);expect(copy.firstElementChild!.scrollTop).toBe(20);expect(drawImage).toHaveBeenCalledWith(source.querySelector('canvas'),0,0);
 scroller.scrollLeft=90;sync();expect(copy.firstElementChild!.scrollLeft).toBe(90);mock.mockRestore();
});
it('keeps SVG chart paint current without rebuilding the surrounding page',()=>{const source=document.createElement('div');source.innerHTML='<svg data-chart-renderer="svg"><path d="M0 0L1 1"/></svg>';const copy=source.cloneNode(true) as HTMLElement;const sync=paintedContentSync(source,copy);sync();source.querySelector('path')!.setAttribute('d','M0 0L3 2');sync();expect(copy.querySelector('path')!.getAttribute('d')).toBe('M0 0L3 2');});
it('copies live text and segmented selection state without recreating layout',()=>{const source=document.createElement('div');source.innerHTML='<b>1</b><button aria-pressed="false">A</button><span class="ui-segment-thumb" style="transform:translateX(0px)"></span>';const copy=source.cloneNode(true) as HTMLElement;const sync=paintedContentSync(source,copy);source.querySelector('b')!.firstChild!.textContent='2';source.querySelector('button')!.setAttribute('aria-pressed','true');(source.querySelector('.ui-segment-thumb') as HTMLElement).style.transform='translateX(30px)';sync();expect(copy.querySelector('b')!.textContent).toBe('2');expect(copy.querySelector('button')!.getAttribute('aria-pressed')).toBe('true');expect((copy.querySelector('.ui-segment-thumb') as HTMLElement).style.transform).toBe('translateX(30px)');});
