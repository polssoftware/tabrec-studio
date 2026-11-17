import {beatPosition,beatTime} from './tempo.js';
import {stretchChannels} from './playlist-editing.js';
export function tempoClipBounds(clip,before,after){const start=beatTime(after,beatPosition(before,clip.start,4),4),end=beatTime(after,beatPosition(before,clip.start+clip.duration,4),4);return {start,duration:Math.max(.005,end-start)};}
export function warpTempoChannels(channels,sr,{before,after,sourceStart,sourceDuration=channels[0].length/sr,start,duration,mode='resample'}){
 const baseBeat=beatPosition(before,sourceStart,4),targetBeat=beatPosition(after,start,4),beatRatio=(beatPosition(before,sourceStart+sourceDuration,4)-baseBeat)/(beatPosition(after,start+duration,4)-targetBeat||1),map=t=>Math.max(0,beatTime(before,baseBeat+(beatPosition(after,start+t,4)-targetBeat)*beatRatio,4)-sourceStart);
 if(mode==='stretch')return stretchChannels(channels,sr,duration,map);
 const length=Math.max(1,Math.round(duration*sr));return channels.map(input=>Float32Array.from({length},(_,i)=>{const pos=map(i/sr)*sr,a=Math.floor(pos),f=pos-a;return (input[a]||0)*(1-f)+(input[a+1]||0)*f;}));
}
