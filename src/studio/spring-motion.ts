/** Unit-mass damped spring: x'' + 2ζω x' + ω²(x−1) = 0.
 * Sampled at 120 Hz-equivalent for WAAPI, with a shared clock for both pages.
 * Duration covers the perceptible movement, with the small residual normalized;
 * no invisible settling tail or second easing is appended.
 */
export function springProgress(t:number,damping:number){
 const z=Math.max(.6,Math.min(1,damping)),end=z===1?6.3:7;
 const response=(time:number)=>z===1?1-(1+time)*Math.exp(-time):1-Math.exp(-z*time)*(Math.cos(Math.sqrt(1-z*z)*time)+z/Math.sqrt(1-z*z)*Math.sin(Math.sqrt(1-z*z)*time));
 return t<=0?0:t>=1?1:response(t*end)/response(end);
}
export function springSamples(damping:number){return Array.from({length:121},(_,i)=>({offset:i/120,progress:springProgress(i/120,damping)}))}
