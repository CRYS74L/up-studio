import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
it('font partitions retain non-overlapping Chinese and Latin coverage for every face',()=>{
 const css=readFileSync('src/fonts.css','utf8'),groups=new Map<string,string[]>();
 for(const [,block] of css.matchAll(/@font-face\{([^}]+)\}/g)){
  const key=block.match(/font-family:([^;]+)/)![1]+':'+block.match(/font-weight:([^;]+)/)![1];
  groups.set(key,[...groups.get(key)??[],block]);
 }
 for(const family of ['UP Studio UI','UP Studio Chart','UP Studio Cloud','UP Studio Manuscript'])expect([...groups.keys()].some(key=>key.startsWith("'"+family+"':"))).toBe(true);
 for(const blocks of groups.values()){
  const covered=new Set<number>();
  for(const block of blocks){
   const points:number[]=[];
   for(const range of block.match(/unicode-range:([^;]+)/)![1].split(',')){
    const [start,end]=range.slice(2).split('-').map(v=>parseInt(v,16));
    for(let point=start;point<=(end??start);point++)points.push(point);
   }
   expect(points.some(point=>covered.has(point)),'overlapping font partitions').toBe(false);
   points.forEach(point=>covered.add(point));
  }
  expect(covered.size).toBeGreaterThan(4000);
  for(const char of ['创','A','0','？'])expect(covered.has(char.codePointAt(0)!)).toBe(true);
 }
});
