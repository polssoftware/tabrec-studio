import {PitchCorrector} from './autotune-dsp.js';
class SimpleAutotune extends AudioWorkletProcessor{
 static get parameterDescriptors(){return [{name:'tuningAmount',defaultValue:100,minValue:0,maxValue:100,automationRate:'k-rate'},{name:'tuningSpeed',defaultValue:100,minValue:0,maxValue:100,automationRate:'k-rate'},{name:'mask',defaultValue:4095,minValue:1,maxValue:4095,automationRate:'k-rate'}];}
 constructor(){super();this.dsp=new PitchCorrector(sampleRate);}
 process(inputs,outputs,parameters){this.dsp.process(inputs[0]||[],outputs[0],{amount:parameters.tuningAmount[0],speed:parameters.tuningSpeed[0],mask:parameters.mask[0]});return true;}
}
registerProcessor('simple-autotune',SimpleAutotune);
