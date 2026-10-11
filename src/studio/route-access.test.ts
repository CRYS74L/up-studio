// @vitest-environment jsdom
import {renderHook,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useStudioRoute} from './route';

afterEach(()=>{cleanup();vi.unstubAllGlobals()});

it.each(['10.77.0.44','198.51.100.8'])('opens overview instead of an unavailable bookmarked settings page on %s',hostname=>{
 vi.stubGlobal('location',{hostname,hash:'#settings?video=1&ids=1,2'});
 const{result}=renderHook(()=>useStudioRoute());
 expect(result.current).toEqual({page:'overview',video:null,tab:null,ids:[]});
});

it.each(['localhost','127.0.0.1'])('keeps the settings route available for local access on %s',hostname=>{
 vi.stubGlobal('location',{hostname,hash:'#settings'});
 const{result}=renderHook(()=>useStudioRoute());
 expect(result.current.page).toBe('settings');
});
