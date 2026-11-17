// Audio-clock clicks stay out of the recording input and project mix.
export function runCountIn(context,{bpm,seconds=3,signal,onTick=()=>{}}){
 return new Promise((resolve,reject)=>{
  const nodes=[],timers=[];let finished=false;
  const abortError=()=>Object.assign(new Error('Count-in cancelled'),{name:'AbortError'});
  function finish(error){if(finished)return;finished=true;timers.forEach(clearTimeout);signal?.removeEventListener('abort',abort);for(const {osc,gain} of nodes){try{osc.stop();}catch{}osc.disconnect();gain.disconnect();}onTick(0);error?reject(error):resolve();}
  const abort=()=>finish(abortError());
  if(signal?.aborted){abort();return;}
  signal?.addEventListener('abort',abort,{once:true});
  try{
   const start=context.currentTime+.02,interval=60/Math.max(30,bpm);
   for(let t=0;t<seconds-.001;t+=interval){const osc=context.createOscillator(),gain=context.createGain();nodes.push({osc,gain});osc.frequency.value=t===0?1200:850;gain.gain.setValueAtTime(.12,start+t);gain.gain.exponentialRampToValueAtTime(.001,start+t+.045);osc.connect(gain).connect(context.destination);osc.start(start+t);osc.stop(start+t+.05);}
   onTick(seconds);for(let n=1;n<seconds;n++)timers.push(setTimeout(()=>onTick(seconds-n),n*1000));timers.push(setTimeout(()=>finish(),seconds*1000+20));
  }catch(error){finish(error);}
 });
}
