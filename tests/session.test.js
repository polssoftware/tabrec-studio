import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moveClipPosition,pickTrackColor,TRACK_COLORS} from '../src/editing.js';
import {runCountIn} from '../src/count-in.js';

const session=()=>({tracks:[{id:'a',group:'g',automation:{volume:[{time:1,value:1}]}},{id:'b',group:'g',automation:{}}],clips:[{id:'left',track:'a',start:0,duration:2,offset:0,asset:'voice'},{id:'right',track:'a',start:2,duration:2,offset:2,asset:'voice'},{id:'other',track:'b',start:1,duration:1,offset:0,asset:'other'}]});
test('sliced clips move independently on the same track and across tracks',()=>{
 const original=session(),moved=moveClipPosition(original,'right',4,'b');
 assert.deepEqual(moved.clips[0],original.clips[0]);assert.deepEqual(moved.clips[2],original.clips[2]);
 assert.equal(moved.clips[1].start,4);assert.equal(moved.clips[1].track,'b');assert.equal(moved.clips[1].offset,2);assert.deepEqual(moved.tracks,original.tracks);
 assert.equal(original.clips[1].start,2);
});
test('explicit group drag moves group audio and automation together without negative positions',()=>{
 const original=session(),moved=moveClipPosition(original,'right',4,'a',true);
 assert.deepEqual(moved.clips.map(c=>c.start),[2,4,3]);assert.equal(moved.tracks[0].automation.volume[0].time,3);
 assert.deepEqual(moveClipPosition(original,'right',0,'a',true).clips.map(c=>c.start),[0,2,1]);
 original.tracks[1].frozen=true;assert.equal(moveClipPosition(original,'right',4,'a',true),original);
});
test('new track colors avoid used colors and favor distinctive colors over adjacent shades',()=>{
 const tracks=[];for(let n=0;n<16;n++){const color=pickTrackColor(tracks,()=>.5);assert.ok(TRACK_COLORS.includes(color));assert.ok(!tracks.some(t=>t.color===color));if(n){const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),a=rgb(color),b=rgb(tracks.at(-1).color);assert.ok(Math.hypot(...a.map((x,i)=>x-b[i]))>45);}tracks.push({color});}
});
function clock(){const starts=[],nodes=[];const context={currentTime:10,destination:{},createOscillator(){const o={frequency:{value:0},connect:n=>n,start:t=>starts.push(t),stop(){},disconnect(){}};nodes.push(o);return o;},createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:n=>n,disconnect(){}};}};return {context,starts,nodes};}
test('count-in lasts three seconds, follows tempo, then allows recording',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {context,starts}=clock(),ticks=[];let complete=false;
 const done=runCountIn(context,{bpm:120,onTick:n=>ticks.push(n)}).then(()=>complete=true);
 assert.equal(starts.length,6);assert.equal(starts[1]-starts[0],.5);assert.deepEqual(ticks,[3]);
 t.mock.timers.tick(1000);assert.deepEqual(ticks,[3,2]);t.mock.timers.tick(1000);assert.deepEqual(ticks,[3,2,1]);assert.equal(complete,false);
 t.mock.timers.tick(1020);await done;assert.equal(complete,true);assert.deepEqual(ticks,[3,2,1,0]);
});
test('cancelling count-in prevents recording from starting',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {context}=clock(),controller=new AbortController();
 const done=runCountIn(context,{bpm:90,signal:controller.signal}),rejected=assert.rejects(done,{name:'AbortError'});
 t.mock.timers.tick(1000);controller.abort();await rejected;t.mock.timers.tick(5000);
});
