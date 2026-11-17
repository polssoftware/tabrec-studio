class LocalGate extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'threshold',defaultValue:-45,minValue:-80,maxValue:-5,automationRate:'k-rate'}];}
 constructor(options){super();this.envelope=0;this.gain=0;this.defaultThreshold=options.processorOptions.threshold??-45;}
 process(inputs,outputs,parameters){const input=inputs[0],out=outputs[0];if(!input?.length)return true;const threshold=Math.pow(10,(parameters.threshold?.[0]??this.defaultThreshold)/20);for(let i=0;i<out[0].length;i++){let peak=0;for(const ch of input)peak=Math.max(peak,Math.abs(ch[i]||0));this.envelope=Math.max(peak,this.envelope*.999);const target=this.envelope>threshold?1:0;this.gain+=(target-this.gain)*(target?.03:.001);for(let c=0;c<out.length;c++)out[c][i]=(input[Math.min(c,input.length-1)][i]||0)*this.gain;}return true;}
}registerProcessor('local-gate',LocalGate);

class LocalReverb extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'size',defaultValue:.7,minValue:.1,maxValue:1,automationRate:'k-rate'},{name:'decay',defaultValue:2,minValue:.2,maxValue:6,automationRate:'k-rate'}];}
 constructor(options={}){super();this.style=options.processorOptions?.style||0;this.lines=Array.from({length:8},()=>new Float32Array(Math.ceil(sampleRate*.1)));this.positions=new Uint32Array(8);this.lengths=[.0297,.0371,.0411,.0437,.0307,.0323,.0393,.0457];this.size=.7;}
 process(inputs,outputs,parameters){const input=inputs[0],out=outputs[0];this.size+=(parameters.size[0]-this.size)*.04;const decay=parameters.decay[0];for(let i=0;i<out[0].length;i++){for(let c=0;c<out.length;c++){let sum=0;const signal=input?.length?(input[Math.min(c,input.length-1)][i]||0):0;for(let j=0;j<4;j++){const k=c*4+j,line=this.lines[k],pos=this.positions[k],delay=sampleRate*this.lengths[k]*(.5+this.size)*(this.style===1?1.3:this.style===2?.8:1),read=(pos-Math.round(delay)+line.length)%line.length,value=line[read],feedback=Math.pow(.001,delay/sampleRate/decay);line[pos]=signal+value*feedback;this.positions[k]=(pos+1)%line.length;sum+=value;}out[c][i]=sum*.25;}}return true;}
}
registerProcessor('local-reverb',LocalReverb);
