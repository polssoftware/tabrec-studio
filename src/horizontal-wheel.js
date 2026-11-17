export function scrollDockHorizontally(element,event,apply,position=element.scrollLeft){
 if(event.ctrlKey||event.metaKey||event.defaultPrevented)return false;
 if(event.target?.closest?.('input,select,textarea,button,[role="slider"],.eq-band-menu'))return false;
 const body=event.target?.closest?.('.effect-parameters');if(body&&body.scrollHeight>body.clientHeight+1&&!event.shiftKey&&Math.abs(event.deltaY)>=Math.abs(event.deltaX))return false;
 const maximum=Math.max(0,element.scrollWidth-element.clientWidth);if(!maximum)return false;
 const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*(event.deltaMode===1?24:event.deltaMode===2?element.clientWidth:1),next=Math.max(0,Math.min(maximum,position+delta));if(next===position)return false;if(apply)apply(next);else element.scrollLeft=next;event.preventDefault();return true;
}

export function smoothWheelController(element,requestFrame,cancelFrame,reducedMotion=false){
 let target=null,frame=null,last=null;
 const stop=()=>{if(frame!==null)cancelFrame(frame);frame=null;target=null;last=null;};
 function tick(time){const goal=Math.max(0,Math.min(element.scrollWidth-element.clientWidth,target??element.scrollLeft)),dt=last===null?16:Math.max(1,Math.min(40,time-last));last=time;const remaining=goal-element.scrollLeft;if(Math.abs(remaining)<.5){element.scrollLeft=goal;frame=null;target=null;last=null;return;}element.scrollLeft+=remaining*(1-Math.exp(-dt/45));frame=requestFrame(tick);}
 return {wheel(event){return scrollDockHorizontally(element,event,next=>{if(reducedMotion){element.scrollLeft=next;return;}target=next;if(frame===null)frame=requestFrame(tick);},target??element.scrollLeft);},stop};
}
