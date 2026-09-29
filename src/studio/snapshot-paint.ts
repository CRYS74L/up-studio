/** CSSOM serialization can restore native button paint inside WebKit shadow
 * snapshots. Freeze the actual control paint instead of trusting UA defaults. */
export function preserveControlPaint(source:HTMLElement,copy:HTMLElement){
 const originals=source.querySelectorAll<HTMLElement>('button,input,select,textarea,a,.s-panel,.s-detail-hero,.s-overview-kpis'),copies=copy.querySelectorAll<HTMLElement>('button,input,select,textarea,a,.s-panel,.s-detail-hero,.s-overview-kpis');
 originals.forEach((original,i)=>{const target=copies[i];if(!target)return;const style=getComputedStyle(original);target.style.setProperty('appearance','none','important');target.style.setProperty('-webkit-appearance','none','important');for(const property of ['background-color','background-image','border-color','color'])target.style.setProperty(property,style.getPropertyValue(property),'important')});
}
export function shadowRootSelectors(css:string){return css.replace(/:root(\[[^\]]+\])?/g,(_match,attribute)=>attribute?':host('+attribute+')':':host')}
