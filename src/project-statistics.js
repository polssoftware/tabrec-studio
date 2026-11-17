export function newStatistics(now=Date.now()){return {createdAt:now,openMs:0,workMs:0,recordings:0,saves:0,copies:0};}
export function statisticsSnapshot(base,session,now=Date.now()){
 return {...base,openMs:base.openMs+Math.max(0,now-session.started),workMs:base.workMs+session.workMs};
}
export function projectStatistics(project,assets){
 const duration=Math.max(0,...project.clips.map(c=>c.start+c.duration));
 const used=new Set([...project.clips,...project.tracks.flatMap(t=>t.frozenBackup?.clips||[])].flatMap(c=>[c.asset,c.pitchSource?.asset,c.stretchSource?.asset,c.tempoSource?.asset].filter(Boolean)));
 const bytes=[...used].reduce((sum,id)=>sum+(assets.get(id)?.bytes?.byteLength||0),0);
 return {tracks:project.tracks.length,duration,bytes,trackDurations:project.tracks.map(t=>({id:t.id,name:t.name,duration:Math.max(0,...project.clips.filter(c=>c.track===t.id).map(c=>c.start+c.duration))}))};
}
