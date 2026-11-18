import {ZOOM_DEFAULT,ZOOM_MIN,ZOOM_MAX} from './zoom.js';
import {SecretText} from './secret-icons.jsx';
import {routeDestinations} from './routing.js';
import React,{useEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,Power,X} from './ui-icons.jsx';
import {beatPosition,beatTime} from './tempo.js';

export const MIXER_STRIP_WIDTH=84;

export function ModalBackdrop({onCancel,disabled=false,children}){return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget&&!disabled)onCancel();}} onKeyDown={e=>{if(e.key==='Escape'&&!disabled){e.preventDefault();e.stopPropagation();onCancel();}}}>{children}</div>;}
export function ZoomCounter({zoom,onChange}){
 const ref=useRef(null),current=useRef({zoom,onChange});current.current={zoom,onChange};const clamp=value=>Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,Math.round(value*1e6)/1e6));
 useEffect(()=>{const el=ref.current;const wheel=e=>{e.preventDefault();current.current.onChange(clamp(current.current.zoom*Math.exp(-e.deltaY*.002)));};el?.addEventListener?.('wheel',wheel,{passive:false});return()=>el?.removeEventListener?.('wheel',wheel);},[]);
 return <button ref={ref} className="zoom-counter" aria-label="Timeline zoom" title="Drag or scroll to zoom · Double-click to reset" onDoubleClick={()=>onChange(ZOOM_DEFAULT)} onPointerDown={e=>{if(e.detail>=2)return;const y=e.clientY,value=zoom;const move=ev=>onChange(clamp(value*Math.exp((y-ev.clientY)/150)));const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);}}><SecretText text={Math.round(zoom/ZOOM_DEFAULT*100)+'%'}/></button>;
}

export function InlineName({value,onChange,label,className='',requestEdit=false,onFinish}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(value),input=useRef(null),done=useRef(false);
 function begin(e){e?.stopPropagation();done.current=false;setDraft(value);setEditing(true);}
 useEffect(()=>{if(requestEdit)begin();},[requestEdit]);
 useEffect(()=>{if(editing){input.current?.focus?.();input.current?.select?.();}},[editing]);
 function finish(cancel=false){if(done.current)return;done.current=true;if(!cancel&&draft.trim()&&draft.trim()!==value)onChange(draft.trim());setEditing(false);onFinish?.();}
 return editing?<input ref={input} className={'inline-name '+className} aria-label={label} value={draft} maxLength={128} onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} onChange={e=>setDraft(e.target.value)} onBlur={()=>finish()} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(e.key==='Escape');}}}/>:<span className={className} title={value+' · Double-click to rename'} onDoubleClick={begin}>{value}</span>;
}

export function BpmCounter({value,onChange,onDrag,disabled,onAutomate}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),input=useRef(null),done=useRef(false);
 useEffect(()=>{if(editing){input.current?.focus?.();input.current?.select?.();}},[editing]);
 function finish(cancel=false){if(done.current)return;done.current=true;if(!cancel&&draft.trim()&&Number.isFinite(Number(draft)))onChange(Math.max(30,Math.min(300,Math.round(Number(draft)))));setEditing(false);}
 return <div className="bpm-field" onContextMenu={e=>{e.preventDefault();e.stopPropagation();onAutomate?.();}}>{editing?<input ref={input} className="bpm bpm-input" aria-label="Edit BPM" inputMode="numeric" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={()=>finish()} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();finish(e.key==='Escape');}}}/>:<button className="bpm" aria-label="BPM" title="Drag up/down or double-click to type tempo" disabled={disabled} onPointerDown={e=>{if(e.detail<2)onDrag(e);}} onDoubleClick={()=>{done.current=false;setDraft(String(value));setEditing(true);}}><b><SecretText text={Math.round(value)}/></b></button>}</div>;
}

export function ScrubNumber({label,value,min,max,step=1,onChange,disabled}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),input=useRef(null),done=useRef(false);const clamp=v=>Math.max(min,Math.min(max,v));
 useEffect(()=>{if(editing){input.current?.focus?.();input.current?.select?.();}},[editing]);
 const finish=cancel=>{if(done.current)return;done.current=true;if(!cancel&&draft.trim()&&Number.isFinite(+draft))onChange(clamp(+draft));setEditing(false);};
 return editing?<input ref={input} className="scrub-number" aria-label={'Edit '+label} value={draft} inputMode="decimal" onChange={e=>setDraft(e.target.value)} onBlur={()=>finish(false)} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();finish(e.key==='Escape');}}}/>:<button className="scrub-number" aria-label={label} title="Drag up/down or double-click to type" disabled={disabled} onDoubleClick={()=>{done.current=false;setDraft(String(value));setEditing(true);}} onPointerDown={e=>{if(e.detail>=2)return;const y=e.clientY;const move=ev=>onChange(clamp(Math.round((value+(y-ev.clientY)*step)*10)/10));const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);}}>{value}</button>;
}
export function TempoGrid({project,zoom,left,width,height}){
 const ref=useRef(null);useEffect(()=>{const canvas=ref.current;if(!canvas)return;const dpr=globalThis.devicePixelRatio||1;canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.strokeStyle=typeof getComputedStyle==='function'?getComputedStyle(canvas).getPropertyValue('--line'):'#363a44';ctx.lineWidth=1;ctx.beginPath();const step=4/(project.gridDivision||16);let beat=Math.floor(beatPosition(project,left/zoom,4)/step)*step;for(let count=0;count<12000;count++,beat+=step){const x=beatTime(project,beat,4)*zoom-left;if(x>width)break;if(x>=0){ctx.moveTo(Math.round(x)+.5,0);ctx.lineTo(Math.round(x)+.5,height);}}ctx.stroke();},[project.tempoAutomation,project.bpm,zoom,left,width,height]);
 return <canvas ref={ref} className="tempo-grid" style={{left,width,height}} aria-hidden="true"/>;
}

const scales=['Chromatic','Major','Minor','Major pentatonic','Minor pentatonic'];
const white=['C','D','E','F','G','A','B'];
const black=[['C#','D♭',1],['D#','E♭',2],['F#','G♭',4],['G#','A♭',5],['A#','B♭',6]];
export function KeySelector({note,scale,onChange,embedded=false}){
 const [open,setOpen]=useState(false),container=useRef(null),trigger=useRef(null);
 useEffect(()=>{if(!open||embedded)return;const outside=e=>{if(!container.current?.contains?.(e.target))setOpen(false);};window.addEventListener('pointerdown',outside,true);return()=>window.removeEventListener('pointerdown',outside,true);},[open,embedded]);
 const prefix=embedded?'Autotune key ':'Key ';
 const picker=<div className={'key-selector '+(embedded?'key-selector-embedded':'')} role={embedded?'group':'dialog'} aria-label={embedded?'Autotune key and scale':'Key and scale selector'}><select aria-label={embedded?'Autotune scale':'Scale'} value={scale} onChange={e=>onChange(note,e.target.value)}>{scales.map(name=><option key={name}>{name}</option>)}</select><div className="key-notes"><div className="black-notes">{black.map(([sharp,flat,column])=><button key={sharp} aria-label={prefix+sharp+' / '+flat} aria-pressed={note===sharp} className={note===sharp?'selected-note':''} style={{gridColumn:column}} onClick={()=>onChange(sharp,scale)}><span>{sharp}</span><small>{flat}</small></button>)}</div><div className="white-notes">{white.map(key=><button key={key} aria-label={prefix+key} aria-pressed={note===key} className={note===key?'selected-note':''} onClick={()=>onChange(key,scale)}>{key}</button>)}</div></div></div>;
 return <div className={embedded?'key-control embedded-key-control':'key-control'} ref={container} onKeyDown={e=>{if(e.key==='Escape'&&!embedded){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus?.();}}}>{embedded?picker:<><button ref={trigger} aria-label="Key and scale" title="Key and scale" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(!open)}><span>{note} {scale}</span><ChevronDown size={12}/></button>{open&&picker}</>}</div>;
}

export function MetronomeIcon({size=16}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3h6l5 18H4L9 3Z"/><path d="m12 17 5-12M10 18h4M8 21h8"/><path d="m14 9 4 1"/></svg>;}
export function RecordIcon({size=16}){return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="currentColor"/></svg>;}

export function MixerCables({channels,selected}){
 const ref=useRef(null),[measured,setMeasured]=useState(0),[centers,setCenters]=useState([]);useEffect(()=>{const el=ref.current?.parentElement;if(!el)return;const measure=()=>{setMeasured(el.clientWidth||0);const origin=el.getBoundingClientRect?.().left||0;setCenters(Array.from(el.querySelectorAll?.('.mixer-strip')||[],strip=>{const r=strip.getBoundingClientRect();return r.left-origin+r.width/2;}));};measure();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;observer?.observe(el);return()=>observer?.disconnect();},[channels.length]);
 const width=Math.max(channels.length*MIXER_STRIP_WIDTH,measured),stripWidth=width/channels.length,edges=channels.filter(ch=>ch.id!=='master').flatMap(ch=>routeDestinations(ch).map(id=>({from:ch,to:channels.find(c=>c.id===id)}))).filter(edge=>edge.to);
 return <svg ref={ref} className="mixer-cables" width={width} height="16" viewBox={'0 0 '+width+' 16'} role="img" aria-label="Mixer output routing"><title>Channel output cables</title>{edges.map(({from,to})=>{const a=(centers[channels.findIndex(c=>c.id===from.id)]??(channels.findIndex(c=>c.id===from.id)+.5)*stripWidth),b=(centers[channels.findIndex(c=>c.id===to.id)]??(channels.findIndex(c=>c.id===to.id)+.5)*stripWidth),y=7+(channels.findIndex(c=>c.id===from.id)%3)*2;return <g key={from.id+'-'+to.id} className={from.id===selected?'selected-cable':''}><title>{from.name+' → '+to.name}</title><path data-from={from.id} data-to={to.id} d={`M ${a} 2 C ${a} ${y}, ${b} ${y}, ${b} 2`}/><circle cx={a} cy="2" r="1.5"/><circle cx={b} cy="2" r="1.5"/></g>;})}</svg>;
}

export function EffectHeader({name,description,enabled,closed,onToggle,onRemove,onCollapse,onMoveLeft,onMoveRight,first,last,onNamePointerDown}){
 const power=<button title="Toggle effect" aria-pressed={enabled} className={enabled?'active':''} onClick={onToggle}><Power size={12}/></button>;
 const title=<b draggable={false} tabIndex={0} aria-label={name} title={description+' Drag this name to reorder.'} data-description={description} onPointerDown={onNamePointerDown}>{name}</b>;
 const remove=<button title="Remove effect" onClick={onRemove}><X size={12}/></button>;
 const collapse=<button title={(closed?'Open ':'Close ')+name} aria-expanded={!closed} onClick={onCollapse}>{closed?<ChevronDown size={12}/>:<ChevronUp size={12}/>}</button>;
 return <div className="effect-title">{closed?<>{collapse}{power}{remove}{title}</>:<>{power}{title}<button title="Move effect left" disabled={first} onClick={onMoveLeft}><ChevronUp size={12} className="rotate-left"/></button><button title="Move effect right" disabled={last} onClick={onMoveRight}><ChevronDown size={12} className="rotate-left"/></button>{remove}{collapse}</>}</div>;
}
