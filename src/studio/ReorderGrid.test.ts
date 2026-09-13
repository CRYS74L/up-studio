// @vitest-environment jsdom
import {createElement} from 'react';
import {expect,it} from 'vitest';
import {ReorderGrid} from './ReorderGrid';
it('does not interrupt animation for an unchanged filter and item identity',()=>{
 const grid=new ReorderGrid({className:'s-library',motionKey:'short',children:createElement('article',{key:'a'},'new value')});
 expect(grid.getSnapshotBeforeUpdate({className:'s-library',motionKey:'short',children:createElement('article',{key:'a'},'old value')})).toBeNull();
});
it('captures visible outgoing cards even when the next filter has no shared ids',()=>{
 const grid=new ReorderGrid({className:'s-library',motionKey:'long',children:createElement('article',{key:'b'})});
 grid.root=document.createElement('div');grid.root.innerHTML='<article data-reorder="a">old card</article>';
 grid.root.getBoundingClientRect=()=>new DOMRect(20,100,200,100);
 (grid.root.firstElementChild as HTMLElement).getBoundingClientRect=()=>new DOMRect(20,100,200,100);
 const snapshot=grid.getSnapshotBeforeUpdate({className:'s-library',motionKey:'short',children:createElement('article',{key:'a'})});
 expect(snapshot?.ghosts.get('a')?.textContent).toBe('old card');
 expect(snapshot?.ghosts.get('a')?.hasAttribute('data-reorder')).toBe(false);
 expect(snapshot?.boxes.has('a')).toBe(true);
});
