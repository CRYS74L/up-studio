import {expect,it} from 'vitest';
import {normalizeLab,LAB_DEFAULTS} from './lab-settings';
it('recovers from missing or invalid saved experiment settings',()=>{expect(normalizeLab(null)).toEqual(LAB_DEFAULTS);expect(normalizeLab({motion:'unknown',duration:NaN,curve:[]})).toEqual(LAB_DEFAULTS)});
it('bounds custom control points, duration and theme travel',()=>{const value=normalizeLab({duration:100000,themeGap:-5,curve:[-1,2,.2,.8]});expect(value.duration).toBe(1000);expect(value.themeGap).toBe(0);expect(value.curve).toEqual([0,1,.2,.8])});
it('keeps saved motion untouched when material parameters are customized',()=>{
 const saved=normalizeLab({motion:'push',duration:530,timing:'spring',damping:1,glass:'demo',glassParameters:{mode:'shader',displacementScale:100,blurAmount:.5,saturation:140,aberrationIntensity:2,tint:0,shadow:.25,overLight:false}});
 expect(saved.duration).toBe(530);expect(saved.motion).toBe('push');expect(saved.damping).toBe(1);expect(saved.glassParameters?.mode).toBe('shader');expect(saved.glassParameters?.displacementScale).toBe(100);
 const invalid=normalizeLab({...saved,glassParameters:{...saved.glassParameters,displacementScale:Infinity,tint:10}});expect(invalid.glassParameters?.displacementScale).toBe(70);expect(invalid.glassParameters?.tint).toBe(.85);expect(invalid.duration).toBe(530);
});
