import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProject,validateEffects,graph,defaults,makeTrack} from '../src/audio.js';
test('empty projects save and reopen; effect chains and presets retain ordering',()=>{
 const effects=['delay','compressor','eq'].map(type=>({id:type,type,enabled:true,params:defaults()}));
 const project={format:'bdaw',version:1,name:'Empty',master:.8,bpm:120,tracks:[],clips:[],assets:[],signature:'6/8',loop:{enabled:true,start:1,end:3},presets:[{id:'preset',effects}]};
 const reopened=validateProject(JSON.parse(JSON.stringify(project)));
 assert.equal(reopened.tracks.length,0);assert.deepEqual(reopened.presets[0].effects.map(e=>e.type),['delay','compressor','eq']);
 assert.throws(()=>validateProject({...project,loop:{start:4,end:2}}));
 assert.throws(()=>validateEffects([{type:'delay',enabled:true,params:{feedback:100}}]));
});
test('audio graph follows effect order, supports duplicates, individual and global bypass',()=>{
 const route=[];
 const node=kind=>({kind,connect(to){route.push([kind,to.kind]);return to;},disconnect(){},gain:{},pan:{},frequency:{},threshold:{},ratio:{},attack:{},release:{}});
 const ctx={createGain:()=>node('gain'),createStereoPanner:()=>node('pan'),createAnalyser:()=>node('meter'),createBiquadFilter:()=>node('eq'),createDynamicsCompressor:()=>node('comp')};
 const effects=['compressor','eq','compressor'].map(type=>({type,enabled:true,params:defaults()}));const track={...makeTrack(1),effects};
 graph(ctx,track,node('output'));assert.deepEqual(route.slice(0,9),[['gain','meter'],['meter','comp'],['comp','meter'],['meter','eq'],['eq','eq'],['eq','eq'],['eq','meter'],['meter','comp'],['comp','meter']]);
 route.length=0;graph(ctx,{...track,bypass:true},node('output'));assert.deepEqual(route,[['gain','gain'],['gain','pan'],['pan','meter'],['meter','output']]);
 route.length=0;graph(ctx,{...track,effects:effects.map(e=>({...e,enabled:false}))},node('output'));assert.equal(route.some(([a,b])=>a==='comp'||b==='eq'),false);
});
