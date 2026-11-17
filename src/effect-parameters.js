import {studioDefaults,studioRanges} from './studio-effects.js';
export const EQ_FREQUENCIES=[60,150,400,1000,2500,6000,12000];
export const extraDefaults=()=>({...studioDefaults,reverbStyle:0,reverbDry:80,delayStyle:1,delayDry:100,tuningAmount:100,tuningSpeed:100,...Object.fromEntries(EQ_FREQUENCIES.flatMap((frequency,i)=>[[`eq${i+1}Frequency`,frequency],[`eq${i+1}Gain`,0],[`eq${i+1}Q`,1],[`eq${i+1}Type`,6],[`eq${i+1}Order`,1]]))});
export const extraRanges={...studioRanges,reverbStyle:[0,2],reverbDry:[0,100],delayStyle:[0,2],delayDry:[0,100],tuningAmount:[0,100],tuningSpeed:[0,100],...Object.fromEntries(EQ_FREQUENCIES.flatMap((_,i)=>[[`eq${i+1}Frequency`,[20,20000]],[`eq${i+1}Gain`,[-18,18]],[`eq${i+1}Q`,[.1,18]],[`eq${i+1}Type`,[0,7]],[`eq${i+1}Order`,[1,10]]]))};
const notes={'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11};
export function tuningMask(key='C',scale='Chromatic'){
 const intervals=scale==='Major'?[0,2,4,5,7,9,11]:scale==='Minor'?[0,2,3,5,7,8,10]:/major.*pent/i.test(scale)?[0,2,4,7,9]:/minor.*pent/i.test(scale)?[0,3,5,7,10]:[0,1,2,3,4,5,6,7,8,9,10,11];
 return intervals.reduce((mask,n)=>mask|(1<<((n+(notes[key]??0))%12)),0);
}
export function nearestScaleMidi(midi,mask){let best=Math.round(midi),distance=Infinity;for(let note=Math.floor(midi)-12;note<=Math.ceil(midi)+12;note++){if(!(mask&(1<<((note%12+12)%12))))continue;const d=Math.abs(note-midi);if(d<distance){best=note;distance=d;}}return best;}
