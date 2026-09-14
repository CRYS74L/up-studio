// @vitest-environment jsdom
import {expect,it,vi} from 'vitest';
import {snapshotStyleSheet} from './page-snapshot';
it('keeps theme conditions inside functional host selectors',()=>{
 class Sheet{css='';replaceSync(css:string){this.css=css}}
 vi.stubGlobal('CSSStyleSheet',Sheet);const style=document.createElement('style');style.textContent=':root{--bg:white}:root[data-theme=dark]{--bg:black}';document.head.append(style);
 const sheet=snapshotStyleSheet() as unknown as Sheet;expect(sheet.css).toContain(':host([data-theme=dark])');expect(sheet.css).not.toContain(':host[data-theme');style.remove();vi.unstubAllGlobals();
});
