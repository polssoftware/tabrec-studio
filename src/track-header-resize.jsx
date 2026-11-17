import {useEffect,useRef,useState} from 'react';
export const clampHeaderWidth=value=>Math.max(180,Math.min(480,Number.isFinite(value)?value:240));
export function useTrackHeaderResize(disabled=false){
 const [width,setWidth]=useState(()=>{try{return clampHeaderWidth(Number(localStorage.getItem('daw-track-header-width')||240));}catch{return 240;}}),cleanup=useRef(null);
 useEffect(()=>{try{localStorage.setItem('daw-track-header-width',String(width));}catch{}},[width]);
 useEffect(()=>()=>cleanup.current?.(),[]);
 function begin(event){if(disabled||event.button>0||event.detail>=2)return;event.preventDefault();event.stopPropagation();cleanup.current?.();const start=event.clientX,original=width,view=event.currentTarget?.ownerDocument?.defaultView||window,move=e=>setWidth(clampHeaderWidth(original+e.clientX-start)),end=e=>{if(e?.type==='pointercancel')setWidth(original);view.removeEventListener('pointermove',move);view.removeEventListener('pointerup',end);view.removeEventListener('pointercancel',end);cleanup.current=null;};cleanup.current=end;view.addEventListener('pointermove',move);view.addEventListener('pointerup',end);view.addEventListener('pointercancel',end);}
 function key(event){if(disabled)return;if(['ArrowLeft','ArrowRight','Home'].includes(event.key)){event.preventDefault();setWidth(event.key==='Home'?240:clampHeaderWidth(width+(event.key==='ArrowLeft'?-10:10)));}}
 return {width,locked:disabled,begin,key,reset:()=>{if(!disabled)setWidth(240);},resetAll:()=>{setWidth(240);}};
}
