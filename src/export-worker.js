import mp3WasmUrl from 'wasm-media-encoders/wasm/mp3?url';
import oggWasmUrl from 'wasm-media-encoders/wasm/ogg?url';
import {encodeWav} from './export-options.js';
import {encodeFlac} from './flac-core.js';
import flacWasmUrl from 'libflacjs/dist/libflac.min.wasm.wasm?url';
self.onmessage=async({data:{channels,sampleRate,preset,level}})=>{
 try{
  let bytes;
  if(preset.format==='wav')bytes=encodeWav(channels,sampleRate,preset.bits);
  else if(preset.format==='flac'){
   self.FLAC_SCRIPT_LOCATION={'libflac.min.wasm.wasm':flacWasmUrl};
   const module=await import('libflacjs/dist/libflac.min.wasm.js'),Flac=module.default||module;
   if(!Flac.isReady())await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('FLAC initialization timed out')),30000);Flac.on('ready',()=>{clearTimeout(timer);resolve();});});
   bytes=await encodeFlac(Flac,channels,sampleRate,preset.bits,level);
  }else{
   for(const channel of channels)for(let i=0;i<channel.length;i++)channel[i]=Number.isFinite(channel[i])?Math.max(-1,Math.min(1,channel[i])):0;
   const {createEncoder}=await import('wasm-media-encoders');
   const encoder=await createEncoder(preset.format==='mp3'?'audio/mpeg':'audio/ogg',preset.format==='mp3'?mp3WasmUrl:oggWasmUrl);
   encoder.configure({channels:channels.length,sampleRate,...preset.format==='mp3'?{bitrate:preset.bitrate,outputSampleRate:sampleRate}:{vbrQuality:({128:4,192:6,320:9})[preset.bitrate]}});
   const chunks=[];for(let at=0;at<channels[0].length;at+=16384){const chunk=encoder.encode(channels.map(ch=>ch.subarray(at,at+16384)));if(chunk.length)chunks.push(chunk.slice());}chunks.push(encoder.finalize().slice());const size=chunks.reduce((sum,c)=>sum+c.length,0);bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
  }
  self.postMessage({bytes},[bytes.buffer]);
 }catch(error){self.postMessage({error:error.message});}
};
