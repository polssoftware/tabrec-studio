import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/audio.js';
import {effectHasChanges} from '../src/effect-settings.js';

test('default effects can be removed without a warning',()=>{
 for(const type of ['eq','compressor','gate','reverb','delay'])assert.equal(effectHasChanges({id:type,type,enabled:true,params:defaults()}),false);
 assert.equal(effectHasChanges({id:'eq',type:'eq',enabled:true,params:{bass:0,mid:0,treble:0}}),false);
});
test('custom effect parameters, bypass, and effect automation require a warning',()=>{
 const eq={id:'tone',type:'eq',enabled:true,params:defaults()};
 assert.equal(effectHasChanges({...eq,params:{...eq.params,bass:3}}),true);
 assert.equal(effectHasChanges({...eq,enabled:false}),true);
 assert.equal(effectHasChanges(eq,{'fx.tone.bass':[{time:0,value:0},{time:1,value:5}]}),true);
 assert.equal(effectHasChanges(eq,{volume:[{time:0,value:.5}],'fx.other.bass':[{time:0,value:2}]}),false);
 assert.equal(effectHasChanges(eq,{'fx.tone.bass':[]}),false);
 // Irrelevant legacy parameters must not make a default EQ look edited.
 assert.equal(effectHasChanges({...eq,params:{...eq.params,decay:5}}),false);
});
