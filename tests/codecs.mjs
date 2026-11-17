import {createEncoder} from 'wasm-media-encoders';
import FlacFactory from 'libflacjs';
import {encodeFlac} from '../src/flac-core.js';
import {encodeWav} from '../src/export-options.js';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const output=path.resolve('.checks/codec-output');await mkdir(output,{recursive:true});
const channels=Array.from({length:2},(_,ch)=>Float32Array.from({length:24000},(_,i)=>Math.sin(2*Math.PI*(ch?330:220)*i/48000)*.3));
const fetchSaved=globalThis.fetch;globalThis.fetch=undefined;const Flac=FlacFactory('min.wasm');if(!Flac.isReady())await new Promise(resolve=>Flac.on('ready',resolve));globalThis.fetch=fetchSaved;
let count=0;
async function check(bytes,format,label,bits){
 const filename=path.join(output,label+'.'+format);await writeFile(filename,bytes);const decoded=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',filename,'-f','f32le','-acodec','pcm_f32le','-ar','48000','-ac','2','pipe:1'],{maxBuffer:8e6});
 const samples=new Float32Array(decoded.buffer,decoded.byteOffset,decoded.byteLength/4);assert.ok(samples.length>=channels[0].length*2-2000&&samples.length<=channels[0].length*2+4000,label+' duration');assert.ok(samples.some(v=>Math.abs(v)>.1));assert.ok(samples.every(Number.isFinite));
 if(bits){let error=0;for(let i=0;i<channels[0].length;i++)for(let ch=0;ch<2;ch++)error=Math.max(error,Math.abs(samples[i*2+ch]-channels[ch][i]));assert.ok(error<(bits===32?1e-7:2**(-bits+2)),label+' PCM accuracy '+error);}
 count++;
}
for(const bits of [16,24,32])await check(encodeWav(channels,48000,bits),'wav','wav-'+bits,bits);
for(const format of ['mp3','ogg'])for(const bitrate of [128,192,320]){
 const encoder=await createEncoder(format==='mp3'?'audio/mpeg':'audio/ogg',new Uint8Array(await readFile(new URL(import.meta.resolve('wasm-media-encoders/wasm/'+format)))));encoder.configure({channels:2,sampleRate:48000,...format==='mp3'?{bitrate,outputSampleRate:48000}:{vbrQuality:({128:4,192:6,320:9})[bitrate]}});const chunks=[encoder.encode(channels).slice(),encoder.finalize().slice()];await check(Buffer.concat(chunks),format,format+'-'+bitrate);
}
for(const bits of [16,24])for(let level=1;level<=8;level++)await check(await encodeFlac(Flac,channels,48000,bits,level),'flac','flac-'+bits+'-'+level,bits);
// Exercise the browser-only libFLAC initialization with no Node globals and the
// same explicit WASM URL mapping used by the production module worker.
const wasm=await readFile(new URL('./dist/libflac.min.wasm.wasm',import.meta.resolve('libflacjs'))),code=await readFile(new URL('./dist/libflac.min.wasm.js',import.meta.resolve('libflacjs')),'utf8');const sandbox={TypeError,RangeError,Error,console,WebAssembly,TextDecoder,TextEncoder,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,location:{href:'https://localhost/assets/encoder.js'},importScripts(){},FLAC_SCRIPT_LOCATION:{'libflac.min.wasm.wasm':'https://localhost/flac.wasm'},fetch:async()=>new Response(wasm,{headers:{'Content-Type':'application/wasm'}})};sandbox.self=sandbox;vm.runInNewContext(code,sandbox);if(!sandbox.Flac.isReady())await new Promise(resolve=>sandbox.Flac.on('ready',resolve));await check(await encodeFlac(sandbox.Flac,channels,48000,24,8),'flac','flac-browser-runtime',24);
console.log('Codec checks passed: '+count+' files decoded by FFmpeg, all FLAC levels and lossless precisions verified, plus browser-mode WASM initialization.');
