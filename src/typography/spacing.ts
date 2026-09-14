export const quarterSpace='\u2005';
export function spaceNumbers(text:string){
 return text.replace(/(?<=\p{Script=Han})[ \u00a0\u2000-\u200a]*(?=\d)|(?<=\d)[ \u00a0\u2000-\u200a]*(?=[%％\p{Script=Han}])/gu,quarterSpace);
}
function children(value:any):any{
 if(typeof value==='string')return spaceNumbers(value);
 if(!Array.isArray(value))return value;
 const result:any[]=[];let text='';
 const flush=()=>{if(text){result.push(spaceNumbers(text));text='';}};
 for(const child of value){if(typeof child==='string'||typeof child==='number')text+=child;else{flush();result.push(child);}}flush();return result;
}
export function spacedProps(type:any,props:any){
 if(!props||typeof type!=='string'||['option','textarea','script','style','pre','code'].includes(type))return props;
 return {...props,children:children(props.children),...(typeof props.placeholder==='string'?{placeholder:spaceNumbers(props.placeholder)}:{})};
}
export function remarkNumberSpacing(){return (tree:any)=>{const visit=(node:any)=>{if(node.type==='text')node.value=spaceNumbers(node.value);else if(node.type!=='code'&&node.type!=='inlineCode')node.children?.forEach(visit)};visit(tree);};}
