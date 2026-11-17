import {detectPitch} from './autotune-dsp.js';
import {STUDIO_EFFECTS,studioDefaults,studioRanges} from './studio-effects.js';
import {StudioProcessor} from './studio-dsp.js';
class StudioWorklet extends AudioWorkletProcessor{
 static get parameterDescriptors(){return [...Object.entries(studioRanges).map(([name,[minValue,maxValue]])=>({name,minValue,maxValue,defaultValue:studioDefaults[name],automationRate:'k-rate'})),{name:'listen',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'}];}
 constructor(options){super();this.type=options.processorOptions.type;this.dsp=new StudioProcessor(this.type,sampleRate);this.keys=STUDIO_EFFECTS[this.type].controls.map(c=>c.key);this.values={};for(const key of this.keys)this.values[key]=studioDefaults[key];this.tick=0;this.first=true;this.pitchSamples=new Float32Array(512);this.pitchAt=0;this.decimate=0;}
 process(inputs,outputs,parameters){const p=this.values;for(const key of this.keys)p[key]=parameters[key][0];if(this.first){this.dsp.configure(p);this.first=false;}this.dsp.targets=p;if(['trultec','filter'].includes(this.type))this.dsp.configure(p);const reduction=this.dsp.process(inputs[0]||[],outputs[0],parameters.listen[0]>.5);if(this.type==='tuner')for(const sample of inputs[0]?.[0]||[]){if(++this.decimate>=4){this.decimate=0;this.pitchSamples[this.pitchAt++%512]=sample;}}if(++this.tick>=Math.ceil(sampleRate/128/20)){this.tick=0;let frequency=0;if(this.type==='tuner'){const ordered=Float32Array.from({length:512},(_,i)=>this.pitchSamples[(this.pitchAt+i)%512]);frequency=detectPitch(ordered,sampleRate/4);}this.port.postMessage({reduction,frequency});}return true;}
}
registerProcessor('studio-effects',StudioWorklet);
