import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extraDefaults} from '../src/effect-parameters.js';
import {bandSettings,eqResponse,EqProcessor,percentToQ,qToPercent,resetBand} from '../src/eq-model.js';
import {spectrumDb,clipSpectrum} from '../src/eq-spectrum-data.js';
import {applyEqAudition} from '../src/eq-audition.js';
const single=(type,order=1)=>({...extraDefaults(),...Object.fromEntries([1,2,3,4,5,6,7].map(i=>[`eq${i}Type`,0])),eq1Type:type,eq1Order:order,eq1Frequency:1000,eq1Gain:6});
test('seven-band defaults remain flat and Q percent conversion covers the full range',()=>{
 const f=extraDefaults();for(const frequency of [20,60,1000,10000,20000])assert.ok(Math.abs(eqResponse(f,frequency))<1e-7);
 assert.equal(percentToQ(0),.1);assert.ok(Math.abs(percentToQ(100)-18)<1e-10);assert.ok(Math.abs(percentToQ(qToPercent(1))-1)<1e-10);assert.equal(resetBand(7).eq7Type,6);assert.equal(resetBand(7).eq7Order,1);
});
test('all eight filter modes change real response, and low/high pass order controls steepness',()=>{
 assert.equal(eqResponse(single(0),1000),0);
 assert.ok(eqResponse(single(1),100)<-.001&&eqResponse(single(1),100)>-1);assert.ok(eqResponse(single(1),10000)<-20);assert.ok(eqResponse(single(1,10),10000)<eqResponse(single(1),10000)-100);
 assert.ok(eqResponse(single(3),100)<-19);assert.ok(eqResponse(single(3),10000)>-1);
 assert.ok(Math.abs(eqResponse(single(2),1000))<1e-6);assert.ok(eqResponse(single(2),100)<-19);assert.ok(eqResponse(single(4),1000)<-100);
 assert.ok(eqResponse(single(5),20)>5.9);assert.ok(Math.abs(eqResponse(single(5),20000))<.1);assert.ok(eqResponse(single(7),20000)>5.9);assert.ok(Math.abs(eqResponse(single(7),20))<.1);
 for(const order of [1,3,10])assert.ok(Math.abs(eqResponse(single(6,order),1000)-6)<1e-6);
});
test('DSP matches a boosted tone, remains finite through all modes/orders and disables cleanly',()=>{
 const processor=new EqProcessor(48000),f=single(6);processor.configure(f);let inputPower=0,outputPower=0;
 for(let block=0;block<500;block++){const input=Float32Array.from({length:128},(_,i)=>.1*Math.sin(2*Math.PI*1000*(block*128+i)/48000)),output=[new Float32Array(128)];processor.process([input],output);if(block>50)for(let i=0;i<128;i++){inputPower+=input[i]**2;outputPower+=output[0][i]**2;}}
 assert.ok(Math.abs(10*Math.log10(outputPower/inputPower)-6)<.05);
 for(let type=0;type<8;type++)for(let order=1;order<=10;order++){processor.configure({...single(type,order),eq1Q:18});const input=new Float32Array(512);input[0]=.1;const output=[new Float32Array(512)];processor.process([input],output);assert.ok(output[0].every(Number.isFinite));}
 processor.configure(single(0));const input=Float32Array.from([.1,.2,-.3,0]),output=[new Float32Array(4)];processor.process([input],output);assert.deepEqual(output[0],input);
});
test('solo audition is a band-pass preview and stays outside serialized effect parameters',()=>{
 const params=extraDefaults();assert.ok(eqResponse(params,60,48000,1)>-1);assert.ok(eqResponse(params,10000,48000,1)<-30);
 const a={value:0},b={value:0},mix={map:{track:{eqNodes:{a:{parameters:new Map([['soloBand',a]])},b:{parameters:new Map([['soloBand',b]])}}}}};applyEqAudition(mix,{a:3});assert.equal(a.value,3);assert.equal(b.value,0);applyEqAudition(mix,{});assert.equal(a.value,0);assert.equal(params.soloBand,undefined);
});
test('spectrum background reflects PCM frequencies and respects the selected clip range',()=>{
 const rate=48000,samples=Float32Array.from({length:4096},(_,i)=>.5*Math.sin(2*Math.PI*1000*i/rate)),db=spectrumDb(samples),peak=db.indexOf(Math.max(...db));assert.ok(Math.abs(peak*rate/4096-1000)<12);assert.ok(db[peak]>-8&&db[peak]<-5);
 const data=new Float32Array(96000);data.set(samples,48000);const buffer={sampleRate:rate,numberOfChannels:1,duration:2,length:data.length,getChannelData:()=>data};assert.ok(Math.max(...clipSpectrum(buffer,0,.25))<-100);assert.ok(Math.max(...clipSpectrum(buffer,1,.085))>-10);
});
