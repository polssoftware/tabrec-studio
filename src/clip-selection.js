export const editableTrack=(project,id)=>!!project.tracks.find(t=>t.id===id&&!t.frozen&&!t.locked);
export function clipsInRectangle(project,rows,box,header=34){
 let top=header;const tracks=new Set();for(const row of rows){if(row.kind==='track'&&top<box.bottom&&top+row.height>box.top)tracks.add(row.track.id);top+=row.height;}
 return project.clips.filter(c=>tracks.has(c.track)&&c.start<box.end&&c.start+c.duration>box.start).map(c=>c.id);
}
export function selectionIds(project,selected,id){return (selected.includes(id)?selected:[id]).filter(key=>{const c=project.clips.find(c=>c.id===key);return c&&editableTrack(project,c.track);});}
export function moveSelection(project,ids,delta,trackDelta=0){
 const clips=project.clips.filter(c=>ids.includes(c.id));if(!clips.length)return project;
 delta=Math.max(delta,-Math.min(...clips.map(c=>c.start)));
 const destinations=new Map(clips.map(c=>[c.id,project.tracks[project.tracks.findIndex(t=>t.id===c.track)+trackDelta]?.id]));
 if([...destinations.values()].some(id=>!editableTrack(project,id)))return project;
 return {...project,clips:project.clips.map(c=>ids.includes(c.id)?{...c,start:c.start+delta,track:destinations.get(c.id)}:c)};
}
export function adjustSelection(project,ids,mode,delta){return {...project,clips:project.clips.map(c=>{
 if(!ids.includes(c.id))return c;
 if(mode==='gain'){const value=Math.max(-96,Math.min(36,(c.gainDb===null?-96:(c.gainDb||0))+delta));return {...c,gainDb:value<=-96?null:Math.round(value*10)/10};}
 const other=mode==='fadeIn'?'fadeOut':'fadeIn';return {...c,[mode]:Math.max(0,Math.min(c.duration-(c[other]||0),(c[mode]||0)+delta))};
 })};}
