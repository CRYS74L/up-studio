import {expect,it} from 'vitest';
import {normalizeLab,LAB_DEFAULTS} from './lab-settings';
it('recovers from missing or invalid saved experiment settings',()=>{expect(normalizeLab(null)).toEqual(LAB_DEFAULTS);expect(normalizeLab({motion:'unknown',duration:NaN,curve:[]})).toEqual(LAB_DEFAULTS)});
it('bounds custom control points, duration and theme travel',()=>{const value=normalizeLab({duration:100000,themeGap:-5,curve:[-1,2,.2,.8]});expect(value.duration).toBe(1000);expect(value.themeGap).toBe(0);expect(value.curve).toEqual([0,1,.2,.8])});
