import {defaults} from './audio.js';
const effect=(type,params)=>({id:crypto.randomUUID(),type,enabled:true,params:{...defaults(),...params}});
export function demoEffects(part){return part===0?[effect('distortion',{distDrive:4,distMix:10}),effect('tr1176',{trInput:0,trOutput:3,trAttack:.4,trRelease:120})]:part===1?[effect('distortion',{distMode:2,distDrive:3,distMix:10})]:[effect('chorus',{chorusMix:24}),effect('reverb',{mix:12,reverbDry:90,reverbStyle:1,decay:1.8})];}
