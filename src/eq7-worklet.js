import {EQ_KEYS,EqProcessor} from './eq-model.js';
import {extraDefaults,extraRanges} from './effect-parameters.js';
class ParametricEq extends AudioWorkletProcessor{
 static get parameterDescriptors(){const defaults=extraDefaults();return [...EQ_KEYS.map(name=>({name,defaultValue:defaults[name],minValue:extraRanges[name][0],maxValue:extraRanges[name][1],automationRate:'k-rate'})),{name:'soloBand',defaultValue:0,minValue:0,maxValue:7,automationRate:'k-rate'}];}
 constructor(){super();this.dsp=new EqProcessor(sampleRate);}
 process(inputs,outputs,parameters){const values={};for(const key of EQ_KEYS)values[key]=parameters[key][0];this.dsp.configure(values,Math.round(parameters.soloBand[0]));this.dsp.process(inputs[0]||[],outputs[0]);return true;}
}
registerProcessor('parametric-eq-7',ParametricEq);
