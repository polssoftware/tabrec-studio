import {useEffect,useRef} from 'react';
// Observer callbacks run only when visibility changes; meter ticks never need
// to measure hundreds of rectangles or read off-screen analysers.
export function useVisibleMeterChannels({count,popup,mixerOpen,collapsed,mobile}){
 const visible=useRef(null);
 useEffect(()=>{const observers=[],nodes=new Map(),documents=[globalThis.document,popup?.document].filter(Boolean);visible.current=null;let supported=false;
  for(const doc of documents){const Observer=doc.defaultView?.IntersectionObserver||globalThis.IntersectionObserver;if(!Observer||!doc.querySelectorAll)continue;supported=true;const observer=new Observer(entries=>{for(const entry of entries)nodes.set(entry.target,entry.isIntersecting);visible.current=new Set([...nodes].filter(([,on])=>on).map(([node])=>node.dataset.meterChannel));});for(const node of doc.querySelectorAll('[data-meter-channel]')){nodes.set(node,false);observer.observe(node);}observers.push(observer);}
  if(supported&&!nodes.size)visible.current=new Set();
  return()=>{for(const observer of observers)observer.disconnect();visible.current=null;};
 },[count,popup,mixerOpen,collapsed,mobile]);return visible;
}
