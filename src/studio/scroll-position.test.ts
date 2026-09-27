// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';import {restoreScroll} from './scroll-position';
it('disables CSS smooth behavior while restoring browser history position',()=>{document.documentElement.style.scrollBehavior='smooth';const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{expect(document.documentElement.style.scrollBehavior).toBe('auto')});restoreScroll(320);expect(scroll).toHaveBeenCalledWith({top:320,left:0,behavior:'auto'});expect(document.documentElement.style.scrollBehavior).toBe('smooth');scroll.mockRestore()});
