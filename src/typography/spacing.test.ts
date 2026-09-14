import {expect,it} from 'vitest';
import {spaceNumbers,spacedProps} from './spacing';
it('normalizes both missing and existing spaces to quarter-em spaces',()=>{
 expect(spaceNumbers('2.9 星 每10分钟 近 30 天 2万人')).toBe('2.9\u2005星 每\u200510\u2005分钟 近\u200530\u2005天\u20052\u2005万人');
 expect(spaceNumbers(spaceNumbers('第3次'))).toBe(spaceNumbers('第3次'));
});
it('joins adjacent display values without changing form values or option semantics',()=>{
 expect(spacedProps('span',{children:['每',10,'分钟']}).children).toEqual(['每\u200510\u2005分钟']);
 expect(spacedProps('input',{value:'近30天'}).value).toBe('近30天');
 expect(spacedProps('option',{children:'近30天'}).children).toBe('近30天');
 expect(spacedProps(()=>null,{children:'`近30天`'}).children).toBe('`近30天`');
});

it('spaces percentages with a quarter em',()=>{expect(spaceNumbers('12.5%')).toBe('12.5\u2005%');expect(spaceNumbers('12.5\u2005%')).toBe('12.5\u2005%');});
