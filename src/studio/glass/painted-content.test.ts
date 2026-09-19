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
