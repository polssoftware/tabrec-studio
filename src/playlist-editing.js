import {clipGain,fadeAt} from './editing.js';

export function nearestZeroCrossing(buffer,seconds,radiusMs=5){
 const sr=buffer.sampleRate,index=Math.max(0,Math.min(buffer.length-1,Math.round(seconds*sr))),radius=Math.round(sr*radiusMs/1000),data=buffer.getChannelData(0);let best=index,score=Infinity;
 for(let i=Math.max(1,index-radius);i<=Math.min(buffer.length-1,index+radius);i++){if(data[i]!==0&&data[i-1]!==0&&Math.sign(data[i])===Math.sign(data[i-1]))continue;let energy=0;for(let c=0;c<buffer.numberOfChannels;c++)energy+=Math.abs(buffer.getChannelData(c)[i]);const cost=energy+Math.abs(i-index)/(radius||1)*.001;if(cost<score){score=cost;best=i;}}
 return score===Infinity?seconds:best/sr;
}
export function sliceRegion(clip,from,to,id=crypto.randomUUID()){
 const duration=to-from;return {...clip,id,start:clip.start+from,offset:clip.offset+from,duration,fadeIn:Math.min(duration,Math.max(0,(clip.fadeIn||0)-from)),fadeOut:Math.min(duration,Math.max(0,(clip.fadeOut||0)-(clip.duration-to))),tempoSource:undefined,pitchSource:undefined,stretchSource:undefined,pitch:0,reversed:false};
}
export function replaceRecording(clips,recorded){
 const end=recorded.start+recorded.duration,next=[];for(const clip of clips){if(clip.track!==recorded.track||clip.start>=end||clip.start+clip.duration<=recorded.start){next.push(clip);continue;}if(clip.start<recorded.start)next.push(sliceRegion(clip,0,recorded.start-clip.start,clip.id));if(clip.start+clip.duration>end)next.push(sliceRegion(clip,end-clip.start,clip.duration));}return [...next,recorded];
}
export function soloChannel(state,id){const target=[...state.tracks,...(state.mixerChannels||[]),...(state.buses||[])].find(t=>t.id===id);if(!target)return state;const enabled=!target.solo;return {...state,tracks:state.tracks.map(t=>({...t,solo:enabled&&t.id===id})),buses:(state.buses||[]).map(t=>({...t,solo:enabled&&t.id===id})),...(state.mixerChannels?{mixerChannels:state.mixerChannels.map(t=>({...t,solo:enabled&&t.id===id}))}:{})};}
export function audibleRegions(channels,sr,options={}){
 const size=channels[0]?.length||0,frame=Math.max(1,Math.round(sr*.005)),minimum=Math.max(frame,Math.round(sr*(options.minimumMs??500)/1000)),pad=Math.round(sr*(options.retainMs??100)/1000),threshold=10**((options.threshold??-45)/20),cuts=[];let silent=-1;
 const gain=options.gain??1,clip={duration:size/sr,fadeIn:options.fadeIn||0,fadeOut:options.fadeOut||0};
 const finish=end=>{if(silent<0)return;if(end-silent>=minimum){const a=silent===0?0:silent+pad,b=end===size?size:end-pad;if(b>a)cuts.push([a,b]);}silent=-1;};
 for(let from=0;from<size;from+=frame){let power=0;const to=Math.min(size,from+frame);for(const channel of channels){let sum=0;for(let i=from;i<to;i++){const x=channel[i]*gain*fadeAt(clip,i/sr);sum+=x*x;}power=Math.max(power,Math.sqrt(sum/(to-from)));}if(power<threshold){if(silent<0)silent=from;}else finish(from);}finish(size);
 const regions=[];let at=0;for(const [a,b]of cuts){if(a>at)regions.push([at,a]);at=b;}if(at<size)regions.push([at,size]);return regions;
}
export function clipsFromRegions(clip,regions,buffer,zeroCrossing=true){return regions.map(([a,b])=>{let from=a/buffer.sampleRate,to=b/buffer.sampleRate;if(zeroCrossing){from=Math.max(0,Math.min(to,nearestZeroCrossing(buffer,clip.offset+from)-clip.offset));to=Math.min(clip.duration,Math.max(from,nearestZeroCrossing(buffer,clip.offset+to)-clip.offset));}if(to-from<.002)return null;const next=sliceRegion(clip,from,to);return {...next,fadeIn:Math.min(next.duration,Math.max(next.fadeIn||0,.002)),fadeOut:Math.min(next.duration,Math.max(next.fadeOut||0,.002))};}).filter(Boolean);}

// Granular waveform-similarity overlap/add. Keeps grain pitch while changing duration.
export function stretchChannels(channels,sr,duration,timeMap=null){
 const count=Math.max(1,Math.round(duration*sr)),inputLength=channels[0].length,ratio=count/inputLength;if(!timeMap&&Math.abs(ratio-1)<1e-6)return channels.map(ch=>ch.slice());
 const n=Math.min(1024,2**Math.floor(Math.log2(Math.max(32,inputLength)))),hop=n/4,search=Math.min(Math.round(sr*.006),n/3),window=Float32Array.from({length:n},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(n-1))),output=channels.map(()=>new Float32Array(count)),weights=new Float32Array(count);
 for(let pos=0;pos<count;pos+=hop){const expected=Math.round(timeMap?timeMap(pos/sr)*sr:pos/ratio),max=Math.max(0,inputLength-1);let offset=Math.min(max,expected),best=-Infinity;
  if(pos&&inputLength>=n){const lo=Math.max(0,expected-search),hi=Math.min(inputLength-n,expected+search),reference=output[0];const score=at=>{let ab=0,aa=0,bb=0;for(let k=0;k<n-hop&&pos+k<count;k+=8){const a=weights[pos+k]>1e-7?reference[pos+k]/weights[pos+k]:0,b=channels[0][at+k]||0;ab+=a*b;aa+=a*a;bb+=b*b;}return ab/Math.sqrt(aa*bb+1e-20);};for(let at=lo;at<=hi;at+=8){const value=score(at);if(value>best){best=value;offset=at;}}const coarse=offset;for(let at=Math.max(lo,coarse-7);at<=Math.min(hi,coarse+7);at++){const value=score(at);if(value>best){best=value;offset=at;}}}
  for(let k=0;k<n&&pos+k<count;k++){const at=pos+k,w=window[k];weights[at]+=w;for(let c=0;c<channels.length;c++)output[c][at]+=(channels[c][offset+k]||0)*w;}
 }
 for(let i=0;i<count;i++)for(let c=0;c<channels.length;c++)output[c][i]=weights[i]>1e-8?output[c][i]/weights[i]:(channels[c][Math.min(inputLength-1,Math.floor(i/ratio))]||0);return output;
}
