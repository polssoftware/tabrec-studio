import {nearestScaleMidi} from './effect-parameters.js';
export function detectPitch(samples,rate){
 const min=Math.max(2,Math.floor(rate/1000)),max=Math.min(Math.floor(rate/70),samples.length>>1),count=samples.length-max;let energy=0;for(const x of samples)energy+=x*x;if(energy/samples.length<.000015)return 0;
 const difference=new Float64Array(max+1);let sum=0;
 for(let lag=1;lag<=max;lag++){let value=0;for(let i=0;i<count;i++){const delta=samples[i]-samples[i+lag];value+=delta*delta;}sum+=value;difference[lag]=sum?value*lag/sum:1;}
 let lag=0;for(let i=min;i<max;i++)if(difference[i]<.16){while(i+1<max&&difference[i+1]<difference[i])i++;lag=i;break;}
 if(!lag)return 0;const a=difference[lag-1],b=difference[lag],c=difference[lag+1],offset=(a-c)/(2*(a-2*b+c)||1);return rate/(lag+Math.max(-.5,Math.min(.5,offset)));
}
export class PitchCorrector{
 constructor(rate){this.rate=rate;this.size=16384;this.lines=[new Float32Array(this.size),new Float32Array(this.size)];this.position=0;this.phase=0;this.ratio=1;this.detector=new Float32Array(512);this.detectorIndex=0;this.decimation=0;this.frequency=0;this.count=0;}
 process(inputs,outputs,{amount=100,speed=100,mask=4095}={}){
  const grain=this.rate*.032,delay=grain+8;
  for(let i=0;i<outputs[0].length;i++){
   const left=inputs[0]?.[i]||0,right=(inputs[1]||inputs[0])?.[i]||0;this.lines[0][this.position]=left;this.lines[1][this.position]=right;
   if(++this.decimation===4){this.decimation=0;this.detector[this.detectorIndex++]=(left+right)*.5;if(this.detectorIndex===512){this.frequency=detectPitch(this.detector,this.rate/4);this.detector.copyWithin(0,128);this.detectorIndex=384;}}
   let target=1;if(this.frequency){const midi=69+12*Math.log2(this.frequency/440);target=2**((nearestScaleMidi(midi,Math.round(mask))-midi)/12*amount/100);}
   const seconds=.003+(1-speed/100)**2*.5;this.ratio+=(target-this.ratio)*(1-Math.exp(-1/(this.rate*seconds)));
   this.phase=(this.phase+(1-this.ratio)/grain+1)%1;
   for(let ch=0;ch<outputs.length;ch++){
    const line=this.lines[Math.min(ch,1)],read=distance=>{const p=(this.position-distance+this.size)%this.size,index=Math.floor(p),fraction=p-index;return line[index]*(1-fraction)+line[(index+1)%this.size]*fraction;};
    const p=this.phase,q=(p+.5)%1,w=.5-.5*Math.cos(2*Math.PI*p),shifted=read(delay+p*grain)*w+read(delay+q*grain)*(1-w);
    outputs[ch][i]=amount===0?(inputs[ch]||inputs[0])?.[i]||0:shifted;
   }
   this.position=(this.position+1)%this.size;this.count++;
  }
 }
}
