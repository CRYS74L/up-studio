// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {getInitialTheme} from './theme';

const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const android='Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36';
const desktop='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';

function environment(userAgent:string,portrait:boolean,dark:boolean,mobile?:boolean){
 vi.stubGlobal('navigator',{userAgent,maxTouchPoints:5,...(mobile===undefined?{}:{userAgentData:{mobile}})});
 vi.stubGlobal('matchMedia',(query:string)=>({matches:query==='(orientation: portrait)'?portrait:query==='(prefers-color-scheme: dark)'?dark:false}));
}

beforeEach(()=>localStorage.clear());
afterEach(()=>vi.unstubAllGlobals());

it.each([iphone,android])('uses system dark mode on a portrait phone despite a saved light preference: %s',userAgent=>{
 environment(userAgent,true,true);localStorage.setItem('insights-theme','light');
 expect(getInitialTheme()).toBe('dark');
 expect(localStorage.getItem('insights-theme')).toBe('light');
});

it('uses system light mode on a portrait phone despite a saved dark preference',()=>{
 environment(iphone,true,false);localStorage.setItem('insights-theme','dark');
 expect(getInitialTheme()).toBe('light');
});

it('accepts the browser mobile hint independently of viewport dimensions',()=>{
 environment('Phone browser',true,true,true);localStorage.setItem('insights-theme','light');
 expect(getInitialTheme()).toBe('dark');
});

it.each([
 [desktop,true],
 [desktop,false],
 [iphone,false],
 [android,false],
 ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',true],
 ['Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',true],
] as const)('preserves the manual preference outside portrait phones: %s, portrait=%s',(userAgent,portrait)=>{
 environment(userAgent,portrait,true);localStorage.setItem('insights-theme','light');
 expect(getInitialTheme()).toBe('light');
});
