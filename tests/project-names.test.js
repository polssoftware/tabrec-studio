import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextProjectSave} from '../src/project-names.js';
test('first save uses the title, subsequent copies increment without nesting',()=>{
 const first=nextProjectSave({name:'SongTestV',lastSaved:null});assert.equal(first.name,'SongTestV');
 const second=nextProjectSave({...first,lastSaved:123});assert.equal(second.name,'SongTestV (1)');
 const third=nextProjectSave({...second,lastSaved:124});assert.equal(third.name,'SongTestV (2)');
 assert.equal(nextProjectSave({...third,lastSaved:125}).name,'SongTestV (3)');
});
test('a renamed saved project starts a new sequence and numeric original titles are preserved',()=>{
 const renamed=nextProjectSave({name:'New song',saveBase:'Old song',saveCopy:3,lastSaved:1});assert.equal(renamed.name,'New song (1)');
 const numeric=nextProjectSave({name:'Song (2026)',lastSaved:null});assert.equal(nextProjectSave({...numeric,lastSaved:1}).name,'Song (2026) (1)');
 assert.equal(nextProjectSave({name:'Old project',lastSaved:1}).name,'Old project (1)');
});
