import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clipsInRectangle,selectionIds,moveSelection,adjustSelection} from '../src/clip-selection.js';
import {newStatistics,statisticsSnapshot,projectStatistics} from '../src/project-statistics.js';
import {validateProject,makeTrack} from '../src/audio.js';
const project=()=>({tracks:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',locked:true}],clips:[{id:'one',track:'a',asset:'audio',start:1,duration:2,gainDb:-3,fadeIn:0,fadeOut:0},{id:'two',track:'b',asset:'audio',start:2,duration:1,gainDb:2,fadeIn:0,fadeOut:0},{id:'locked',track:'c',start:0,duration:3}]});
test('rectangle selects intersecting clips across actual lane heights, including grouped rows',()=>{
 const rows=[{kind:'group',height:24},{kind:'track',track:{id:'a'},height:96},{kind:'track',track:{id:'b'},height:40},{kind:'track',track:{id:'c'},height:96}];
 assert.deepEqual(clipsInRectangle(project(),rows,{start:1.5,end:3,top:58,bottom:194}),['one','two']);
 assert.deepEqual(clipsInRectangle(project(),rows,{start:4,end:5,top:58,bottom:194}),[]);
});
test('shared move preserves spacing, clamps at zero and cannot move onto locked tracks',()=>{
 const p=project(),ids=selectionIds(p,['one','two','locked'],'one');assert.deepEqual(ids,['one','two']);
 const moved=moveSelection(p,ids,-5);assert.deepEqual(moved.clips.slice(0,2).map(c=>c.start),[0,1]);assert.equal(moved.clips[2],p.clips[2]);
 assert.equal(moveSelection(p,ids,2,1),p);
});
test('shared gain and fades preserve relative values and clamp each clip independently',()=>{
 const p=project(),gain=adjustSelection(p,['one','two'],'gain',4);assert.deepEqual(gain.clips.slice(0,2).map(c=>c.gainDb),[1,6]);
 const fade=adjustSelection(p,['one','two'],'fadeIn',1.5);assert.deepEqual(fade.clips.slice(0,2).map(c=>c.fadeIn),[1.5,1]);
 assert.equal(adjustSelection(p,['one'],'gain',-200).clips[0].gainDb,null);
});
test('statistics snapshots accumulate session time without double counting saves, and size deduplicates shared audio',()=>{
 const base={...newStatistics(1000),openMs:5000,workMs:2000,saves:2,copies:1},session={started:10000,workMs:3000};
 assert.deepEqual(statisticsSnapshot(base,session,14000),{...base,openMs:9000,workMs:5000});assert.equal(base.openMs,5000);
 const stats=projectStatistics(project(),new Map([['audio',{bytes:new ArrayBuffer(1024)}]]));assert.equal(stats.bytes,1024);assert.equal(stats.duration,3);assert.equal(stats.tracks,3);
});
test('project validation preserves locks and statistics while rejecting malformed saved metadata',()=>{
 const p={format:'bdaw',version:1,name:'Test',bpm:120,master:1,tracks:[{...makeTrack(1),locked:true}],clips:[],assets:[],statistics:newStatistics(1000)};
 assert.equal(validateProject(p).tracks[0].locked,true);
 assert.throws(()=>validateProject({...p,statistics:{...p.statistics,recordings:-1}}),/statistics/);
 assert.throws(()=>validateProject({...p,tracks:[{...p.tracks[0],locked:'yes'}]}),/lock/);
});
