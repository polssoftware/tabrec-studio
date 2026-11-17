import {STUDIO_EFFECTS} from './studio-effects.js';
import {extraRanges} from './effect-parameters.js';
import {defaults} from './audio.js';

const keys={...Object.fromEntries(Object.entries(STUDIO_EFFECTS).map(([type,e])=>[type,e.controls.map(c=>c.key)])),autotune:['tuningAmount','tuningSpeed'],eq7:Object.keys(extraRanges).filter(key=>key.startsWith('eq')),eq:['bass','mid','treble'],compressor:['threshold','ratio','attack','release'],gate:['gateThreshold'],reverb:['size','decay','mix','reverbStyle','reverbDry'],delay:['time','feedback','delayMix','delayStyle','delayDry']};
export function reorderEffects(effects,fromId,toId){
 const from=effects.findIndex(e=>e.id===fromId),to=effects.findIndex(e=>e.id===toId);if(from<0||to<0||from===to)return effects;
 const next=[...effects],[item]=next.splice(from,1);next.splice(to,0,item);return next;
}
export function effectHasChanges(effect,automation={}){
 const initial=defaults(),relevant=keys[effect.type]||Object.keys(effect.params||{});
 return effect.enabled===false||relevant.some(key=>{const value=effect.params?.[key]??initial[key];return typeof value==='number'&&typeof initial[key]==='number'?Math.abs(value-initial[key])>1e-6:value!==initial[key];})||Object.entries(automation).some(([key,points])=>key.startsWith('fx.'+effect.id+'.')&&points?.length);
}
