import {warpTempoChannels} from './tempo-audio.js';
import {processCleanup} from './cleanup-dsp.js';
import {audibleRegions,stretchChannels} from './playlist-editing.js';
self.onmessage=e=>{try{const {channels,sampleRate,type,options}=e.data,result=type==='tempo'?{channels:warpTempoChannels(channels,sampleRate,options)}:type==='regions'?{regions:audibleRegions(channels,sampleRate,options)}:type==='stretch'?{channels:stretchChannels(channels,sampleRate,options.duration)}:processCleanup(channels,sampleRate,type,options);self.postMessage(result,result.channels?.map(ch=>ch.buffer)||[]);}catch(error){self.postMessage({error:error.message});}};
