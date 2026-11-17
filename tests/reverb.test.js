import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('reverb size and decay automation produces stable, distinct tails',()=>{
 const processors={};vm.runInNewContext(readFileSync(new URL('../src/gate.js',import.meta.url),'utf8'),{AudioWorkletProcessor:class{},sampleRate:8000,registerProcessor:(name,processor)=>processors[name]=processor});
 function render(size,decay){const reverb=new processors['local-reverb'](),samples=[];for(let block=0;block<160;block++){const input=new Float32Array(128);if(!block)input[0]=1;const output=[new Float32Array(128),new Float32Array(128)];reverb.process([[input]],[output],{size:[size],decay:[decay]});samples.push(...output[0]);}assert.ok(samples.every(Number.isFinite));return samples;}
 const short=render(.2,.3),long=render(.9,4);assert.notDeepEqual(short,long);const energy=data=>data.slice(8000).reduce((sum,x)=>sum+x*x,0);assert.ok(energy(long)>energy(short));
});
