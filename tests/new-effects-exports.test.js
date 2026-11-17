import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav,EXPORT_PRESETS,estimatedExportBytes} from '../src/export-options.js';
import {detectPitch,PitchCorrector} from '../src/autotune-dsp.js';
import {tuningMask,nearestScaleMidi} from '../src/effect-parameters.js';
import {defaults,validateEffects,graph} from '../src/audio.js';
test('WAV presets write 16/24-bit PCM and 32-bit float with correct sizes and full precision',()=>{
 const channels=[new Float32Array([-1,-.5,0,.5,1]),new Float32Array([.25,0,0,0,.75])];
 for(const bits of [16,24,32]){const data=encodeWav(channels,48000,bits),view=new DataView(data.buffer);assert.equal(data.length,44+5*2*bits/8);assert.equal(view.getUint16(34,true),bits);assert.equal(view.getUint16(20,true),bits===32?3:1);}
 const bytes=encodeWav(channels,48000,24);assert.deepEqual([...bytes.slice(44,47)],[0,0,128]);
 assert.equal(EXPORT_PRESETS.length,11);assert.equal(estimatedExportBytes(EXPORT_PRESETS.find(p=>p.id==='wav-24'),1),288044);
});
test('autotune detects vocal pitch, follows key/scale and bypasses exactly at zero amount',()=>{
 const data=Float32Array.from({length:512},(_,i)=>Math.sin(2*Math.PI*233.08*i/12000)*.4);assert.ok(Math.abs(detectPitch(data,12000)-233.08)<1);
 assert.equal(detectPitch(new Float32Array(512),12000),0);assert.equal(tuningMask('C','Chromatic'),4095);assert.equal(nearestScaleMidi(70.2,tuningMask('A','Minor')),71);
 const dsp=new PitchCorrector(48000),out=[new Float32Array(128),new Float32Array(128)],input=Float32Array.from({length:128},(_,i)=>Math.sin(i)*.2);dsp.process([input,input],out,{amount:0});assert.deepEqual(out[0],input);assert.deepEqual(out[1],input);
});
test('new effects validate their ranges and a neutral seven-band graph binds all 35 controls',()=>{
 const params=defaults();assert.equal(params.tuningAmount,100);assert.equal(params.tuningSpeed,100);assert.ok(validateEffects([{id:'a',type:'autotune',enabled:true,params},{id:'q',type:'eq7',enabled:true,params}]));assert.throws(()=>validateEffects([{type:'eq7',enabled:true,params:{...params,eq3Q:0}}]),/parameter/);
 const node=()=>({gain:{value:1},pan:{value:0},frequency:{value:0},Q:{value:0},connect(){return this;},disconnect(){}}),ctx={sampleRate:48000,createGain:node,createStereoPanner:node,createAnalyser:node},original=globalThis.AudioWorkletNode;
 globalThis.AudioWorkletNode=class{constructor(context,name){Object.assign(this,node());this.parameters=new Map([...Object.keys(params).filter(key=>/^eq[1-7]/.test(key)),'soloBand'].map(key=>[key,{value:key==='soloBand'?0:params[key]}]));}};
 try{const result=graph(ctx,{volume:1,pan:0,effects:[{id:'q',type:'eq7',enabled:true,params}]},node());assert.equal(Object.keys(result.params).filter(key=>key.startsWith('fx.q')).length,35);assert.ok(result.eqNodes.q);assert.ok(result.effectAnalysers.q);assert.equal(result.eqNodes.q.parameters.get('soloBand').value,0);}finally{if(original)globalThis.AudioWorkletNode=original;else delete globalThis.AudioWorkletNode;}

});

test('autotune corrects an off-key 430 Hz voice tone toward A440 with stereo output',()=>{
 const dsp=new PitchCorrector(48000),samples=[];for(let block=0;block<400;block++){const input=Float32Array.from({length:128},(_,i)=>Math.sin(2*Math.PI*430*(block*128+i)/48000)*.4),output=[new Float32Array(128),new Float32Array(128)];dsp.process([input,input],output,{amount:100,speed:100,mask:1<<9});assert.deepEqual(output[0],output[1]);samples.push(...output[0]);}
 const slice=Float32Array.from({length:512},(_,i)=>samples[40000+i*4]);assert.ok(Math.abs(detectPitch(slice,12000)-440)<2);
});
