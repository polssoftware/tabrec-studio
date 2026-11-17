import {encodeWav} from './export-options.js';
export function encodeExport(buffer,preset,level,signal){
 if(signal?.aborted)return Promise.reject(Object.assign(Error('Export cancelled'),{name:'AbortError'}));
 // Tiny WAV encodes are also available without Worker (e.g. test/SSR environments).
 const channels=Array.from({length:buffer.numberOfChannels},(_,ch)=>buffer.getChannelData(ch).slice());
 if(preset.format==='wav'&&(typeof Worker==='undefined'||buffer.length<=48000))return Promise.resolve(encodeWav(channels,buffer.sampleRate,preset.bits));
 return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./export-worker.js',import.meta.url),{type:'module'}),finish=(error,value)=>{signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value);},abort=()=>finish(Object.assign(Error('Export cancelled'),{name:'AbortError'}));signal?.addEventListener('abort',abort,{once:true});worker.onmessage=e=>finish(e.data.error?Error(e.data.error):null,e.data.bytes);worker.onerror=e=>finish(Error(e.message||'Audio encoder failed'));worker.postMessage({channels,sampleRate:buffer.sampleRate,preset,level},channels.map(ch=>ch.buffer));});
}
