import {expect,it} from 'vitest';
import {tooltipPosition} from './tooltip-position';
it('keeps tooltip inside the visual viewport when a chart is scrolled or near an edge',()=>{
 for(const chart of [{left:16,top:-220},{left:16,top:420},{left:-120,top:200}])for(const point of [[0,0],[380,240],[190,500]]){
 const [x,y]=tooltipPosition(point,chart,{width:240,height:80},{width:390,height:844},88);
 expect(x+chart.left).toBeGreaterThanOrEqual(12);expect(x+chart.left+240).toBeLessThanOrEqual(378);
 expect(y+chart.top).toBeGreaterThanOrEqual(12);expect(y+chart.top+80).toBeLessThanOrEqual(744);
 }
});
