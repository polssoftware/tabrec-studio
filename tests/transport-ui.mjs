import React from 'react';
import {create,act} from 'react-test-renderer';
import assert from 'node:assert/strict';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let animationFrame;globalThis.requestAnimationFrame=fn=>{animationFrame=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.window={innerWidth:1440,innerHeight:900,addEventListener(){},removeEventListener(){}};
let activeContext,sourcesPlayed=0;const timelineView={clientWidth:400,scrollLeft:0},streams=[],recorders=[];
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{enumerateDevices:async()=>[],getUserMedia:async()=>{const stream={stopped:false,getTracks(){return [{stop:()=>{stream.stopped=true;}}];}};streams.push(stream);return stream;}}}});
function node(){const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});return {gain:param(),pan:param(),frequency:param(),connect:to=>to,disconnect(){},start(){},stop(){},getFloatTimeDomainData(data){data.fill(0);}};}
globalThis.AudioContext=class{constructor(){activeContext=this;this.currentTime=0;this.sampleRate=48000;this.destination=node();this.audioWorklet={addModule:async()=>{}};}async resume(){}createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,getChannelData:c=>data[c]};}createBufferSource(){const result=node();result.start=()=>sourcesPlayed++;return result;}createGain(){return node();}createStereoPanner(){return node();}createAnalyser(){return node();}createChannelSplitter(){const splitter=node();Object.defineProperty(splitter,'channelInterpretation',{get:()=> 'discrete',set:value=>{if(value!=='discrete')throw Error('InvalidStateError: splitter interpretation is fixed');}});return splitter;}createChannelMerger(){return node();}createMediaStreamSource(){return node();}createOscillator(){return node();}};
const {defaults}=await import('../src/audio.js');
globalThis.AudioWorkletNode=class{constructor(ctx,name){this.parameters=new Map(Object.entries({...defaults(),soloBand:0,listen:0,mask:4095}).map(([key,value])=>[key,{value,setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}}]));if(name==='local-recorder')recorders.push(this);this.messages=[];this.port={onmessage:null,postMessage:message=>{this.messages.push(message);if(message==='stop')queueMicrotask(()=>this.port.onmessage?.({data:{done:true}}));}};}connect(to){return to;}disconnect(){}};
globalThis.devicePixelRatio=1;
const canvas={clientWidth:100,clientHeight:49,getContext:()=>({scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})};
const {App}=await import('../.checks/ssr/main.js');let app;
await act(async()=>{app=create(React.createElement(App),{createNodeMock:el=>el.props.className==='timeline-scroll'?timelineView:el.type==='canvas'?canvas:null});});
const root=app.root,button=title=>root.findAllByType('button').find(n=>n.props.title===title),click=async title=>act(async()=>{await button(title).props.onClick();});
const transport=()=>root.findByProps({className:'center-transport'}).findAllByType('button');
assert.deepEqual(transport().map(n=>n.props.title.split(' · ')[0]),['Quick Retake','Play','Stop','Record','Loop','Enable microphone input meter']);
await click('Play');assert.ok(button('Pause'));await click('Pause');assert.ok(button('Play'));
await click('Auto-scroll timeline');await click('3-second recording count-in');await click('Record');
assert.equal(button('Record').props['aria-pressed'],true);assert.equal(streams.length,0);assert.equal(recorders.length,0);
let pending;await act(async()=>{pending=button('Play').props.onClick();await new Promise(setImmediate);});
assert.equal(recorders.length,0);assert.equal(root.findByProps({className:'time '}).findByType('strong').findByProps({className:'native-text'}).children[0],'3');
await act(async()=>{button('Stop').props.onClick();await pending;});assert.equal(recorders.length,0);assert.equal(streams[0].stopped,true);

await act(async()=>{pending=button('Play').props.onClick();await new Promise(setImmediate);});assert.equal(recorders.length,0);await act(async()=>{await pending;});
assert.equal(recorders.length,1);assert.ok(recorders[0].messages.some(m=>m.startFrame!==undefined));const resize=root.findAllByType('button').find(n=>n.props.title?.startsWith('Resize Track '));await act(async()=>resize.props.onClick({stopPropagation(){}}));await act(async()=>animationFrame());assert.equal(root.findByProps({className:'record-clip'}).props.style.height,31);assert.ok(root.findByProps({className:'time recording-time'}));
await act(async()=>{activeContext.currentTime=20;animationFrame();});assert.ok(timelineView.scrollLeft>0);
await act(async()=>recorders[0].port.onmessage({data:{channels:[new Float32Array(48000).fill(.2),new Float32Array(48000).fill(.2)]}}));await click('Stop');
const clips=()=>root.findAllByType('div').filter(n=>n.props.className?.startsWith('audio-clip '));assert.equal(clips().length,1);assert.equal(streams[1].stopped,true);
await click('3-second recording count-in');const before=sourcesPlayed;await click('Play');assert.equal(recorders.length,2);assert.equal(sourcesPlayed,before,'previous take must not play underneath a new recording');
await act(async()=>recorders[1].port.onmessage({data:{channels:[new Float32Array(24000).fill(.4),new Float32Array(24000).fill(.4)]}}));await click('Stop');
assert.equal(clips().length,2);await click('Undo');assert.equal(clips().length,1);await click('Redo');assert.equal(clips().length,2);await click('Undo');assert.equal(clips().length,1);await click('Record');assert.equal(button('Record').props['aria-pressed'],false);
const previousPlays=sourcesPlayed;await click('Play');assert.ok(button('Pause'));assert.ok(sourcesPlayed>previousPlays,'existing clips must start with the browser-constrained stereo graph');await click('Stop');

// Retake immediately reopens the same track, discards the latest capture and keeps undo.
const oldTakeIds=clips().map(c=>c.props['data-clip-id']);await click('Record');await click('Play');await act(async()=>recorders[2].port.onmessage({data:{channels:[new Float32Array(12000).fill(.2),new Float32Array(12000).fill(.2)]}}));await click('Stop');
await click('Quick Retake');assert.equal(recorders.length,4);assert.ok(root.findByProps({className:'time recording-time'}));
await act(async()=>recorders[3].port.onmessage({data:{channels:[new Float32Array(12000).fill(.3),new Float32Array(12000).fill(.3)]}}));
await click('Quick Retake');await act(async()=>{await new Promise(setImmediate);});assert.equal(recorders.length,5);assert.equal(streams[3].stopped,true);
await act(async()=>recorders[4].port.onmessage({data:{channels:[new Float32Array(12000).fill(.5),new Float32Array(12000).fill(.5)]}}));await click('Stop');assert.ok(clips().length>0);await click('Undo');assert.deepEqual(clips().map(c=>c.props['data-clip-id']),oldTakeIds);await click('Redo');assert.ok(clips().length>0);
// The input meter is opt-in outside recording and releases its stream on disable.
activeContext.createAnalyser=()=>({...node(),getFloatTimeDomainData(data){data.fill(.5);}});await act(async()=>root.findByProps({'aria-label':'Microphone input meter'}).props.onClick());await act(async()=>new Promise(resolve=>setTimeout(resolve,65)));assert.ok(Math.abs(root.findByProps({'aria-label':'Microphone level'}).props['aria-valuenow']+6.0206)<.01);assert.equal(root.findByProps({'aria-label':'Microphone input meter'}).props['aria-pressed'],true);const meterStream=streams.at(-1);await act(async()=>root.findByProps({'aria-label':'Microphone input meter'}).props.onClick());assert.equal(meterStream.stopped,true);

// Moving an EQ band changes bound parameters without restarting any source.
if(button('Record').props['aria-pressed'])await click('Record');
await click('Effects menu');await act(async()=>root.findAllByType('button').find(b=>b.children.includes('Add effect')).props.onClick());await act(async()=>root.findAllByType('button').find(b=>b.children.includes('Parametric EQ')).props.onClick());
await click('Play');const runningSources=sourcesPlayed;
await act(async()=>root.findByProps({'aria-label':'Select EQ band 4'}).props.onContextMenu({preventDefault(){},stopPropagation(){},clientX:500,clientY:200,currentTarget:{}}));
for(const value of [500,1200,2300,6000])await act(async()=>root.findByProps({'aria-label':'EQ band frequency'}).props.onKeyDown({key:value%2?'Home':'End',preventDefault(){}}));
assert.equal(sourcesPlayed,runningSources,'frequency edits must never restart playback');assert.ok(button('Pause'));await click('Stop');
await act(async()=>app.unmount());
console.log('Transport checks passed: existing-clip playback and recording with browser-constrained splitters, arm before play, count-in cancellation, frame-aligned capture, overwrite without layering, take undo/redo, red timer and auto-scroll.');
