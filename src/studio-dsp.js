import {studioDefaults} from './studio-effects.js';
import {bandCoefficients} from './eq-model.js';
const db=v=>10**(v/20),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Saturation uses modest drive and soft knees; distortion uses stronger nonlinearities.
export function distortionShape(x,drive,mode=3){
 mode=Math.round(mode);const gentle=1+(drive-1)*.22,u=x*gentle;
 if(mode===0)return (Math.tanh(u+.12)-Math.tanh(.12))/Math.tanh(gentle); // asymmetric tube warmth
 if(mode===1)return u/Math.sqrt(1+u*u)/ (gentle/Math.sqrt(1+gentle*gentle)); // rounded tape knee
 if(mode===2){const diode=v=>Math.sign(v)*(1-Math.exp(-Math.abs(v)));return diode(u)/diode(gentle);} // soft diode knee
 if(mode===3)return Math.atan(x*drive)*2/Math.PI; // overdrive
 if(mode===4)return Math.tanh(x*drive*3); // fuzz, near-square at high drive
 const high=Math.tanh(x*drive)-Math.tanh(x);return x+high*.8; // parallel harmonic exciter
}
function biquadSample(x,c,s){const y=c[0]*x+s[0];s[0]=c[1]*x-c[3]*y+s[1];s[1]=c[2]*x-c[4]*y;return y;}
export class StudioProcessor{
 constructor(type,rate=48000){this.type=type;this.rate=rate;this.p={...studioDefaults};this.samples=new Float64Array(2);this.low=[0,0];this.env=0;this.slow=0;this.reduction=0;this.phase=0;this.pos=0;this.held=[0,0];this.hold=0;this.delay=[new Float32Array(Math.ceil(rate*.1)),new Float32Array(Math.ceil(rate*.1))];this.allpass=[new Float64Array(6),new Float64Array(6)];this.feedback=[0,0];this.filters=[];this.signature='';this.carrierPhase=0;this.vocoderBands=Array.from({length:12},(_,i)=>({c:bandCoefficients({type:2,frequency:120*(8000/120)**(i/11),gain:0,q:1.5,order:1},rate)[0],voice:new Float64Array(2),carrier:new Float64Array(2),env:0}));}
 configure(values){if(this.type==='filter'){const p={...this.p,...values},signature=[p.flCutoff,p.flQ,Math.round(p.flType)].join();if(signature!==this.signature){this.signature=signature;this.filters=[{c:bandCoefficients({type:[1,3,2][Math.round(p.flType)],frequency:p.flCutoff,q:p.flQ,gain:0,order:2},this.rate)[0],state:this.filters[0]?.state||[new Float64Array(2),new Float64Array(2)]}];}}for(const key in values)if(Number.isFinite(values[key]))this.p[key]=values[key];if(this.type==='trultec'){const p=this.p,signature=[p.tlLowFreq,p.tlLowBoost,p.tlLowCut,p.tlHighFreq,p.tlHighBoost,p.tlHighCut,p.tlWidth].join();if(signature!==this.signature){this.signature=signature;const settings=[[5,p.tlLowFreq,p.tlLowBoost,.7],[5,p.tlLowFreq*1.8,-p.tlLowCut,.7],[6,p.tlHighFreq,p.tlHighBoost,p.tlWidth],[7,p.tlHighFreq*.75,-p.tlHighCut,.7]];this.filters=settings.map(([type,frequency,gain,q],i)=>({c:bandCoefficients({type,frequency,gain,q,order:1},this.rate)[0],state:this.filters[i]?.state||[new Float64Array(2),new Float64Array(2)]}));}}}
 process(input,output,listen=false){const p=this.p,r=this.rate,t=this.type,N=output[0].length,sm=1-Math.exp(-1/(r*.008)),vocAttack=1-Math.exp(-1/(r*.005)),vocRelease=1-Math.exp(-1/(r*.06));let maxReduction=0;
 const prefix=t==='saturation'?'sat':'dist',drive=db(p[prefix+'Drive']),tone=1-Math.exp(-2*Math.PI*p[prefix+'Tone']/r),mix=p[prefix+'Mix']/100;
 for(let i=0;i<N;i++){
 // Smooth every UI parameter at sample rate, including discrete selections rounded at use.
 const targets=this.targets;if(targets)for(const key in targets)p[key]+=(targets[key]-p[key])*sm;
 const samples=this.samples;samples[0]=input[0]?.[i]||0;samples[1]=(input[1]||input[0])?.[i]||0;let gain=1;
 if(t==='deesser'){const alpha=1-Math.exp(-2*Math.PI*p.deFrequency/r);let peak=0;for(let ch=0;ch<2;ch++){this.low[ch]+=alpha*(samples[ch]-this.low[ch]);peak=Math.max(peak,Math.abs(samples[ch]-this.low[ch]));}this.env+=(peak-this.env)*(1-Math.exp(-1/(r*(peak>this.env?.0005:.06))));const over=Math.max(0,20*Math.log10(this.env+1e-12)-p.deThreshold);this.reduction=Math.min(24,over*.75);gain=db(-this.reduction);}
 if(t==='tr1176'||t==='tr2a'){const fet=t==='tr1176',inputGain=fet?db(p.trInput):1,peak=Math.max(Math.abs(samples[0]*inputGain),Math.abs(samples[1]*inputGain)),attack=fet?p.trAttack/1000:.01,release=fet?p.trRelease/1000:.06;this.env+=(peak-this.env)*(1-Math.exp(-1/(r*(peak>this.env?attack:release))));this.slow+=(peak-this.slow)*(1-Math.exp(-1/(r*(peak>this.slow?.025:2.5))));const level=fet?this.env:Math.max(this.env,this.slow*.8),threshold=fet?-18:-4-p.laPeak*.48,ratio=fet?p.trRatio:(Math.round(p.laMode)?10:4);this.reduction=Math.max(0,(20*Math.log10(level+1e-12)-threshold)*(1-1/ratio));gain=inputGain*db(-this.reduction)*db(fet?p.trOutput:p.laGain);}
 maxReduction=Math.max(maxReduction,this.reduction);
 let vocoded=0;if(t==='vocoder'){this.carrierPhase=(this.carrierPhase+p.vocCarrier/r)%1;const carrier=this.carrierPhase*2-1,voice=(samples[0]+samples[1])*.5;for(const band of this.vocoderBands){const v=biquadSample(voice,band.c,band.voice),c=biquadSample(carrier,band.c,band.carrier),m=Math.abs(v);band.env+=(m-band.env)*(m>band.env?vocAttack:vocRelease);vocoded+=c*band.env*5;}}

 if(t==='bitcrusher'){this.hold-=p.bitRate/r;if(this.hold<=0){this.hold+=1;const levels=Math.max(1,2**(Math.round(p.bitBits)-1)-1);for(let ch=0;ch<2;ch++)this.held[ch]=Math.round(clamp(samples[ch],-1,1)*levels)/levels;}}
 const rate=t==='autopan'?p.apRate:p[t+'Rate']||.5;this.phase=(this.phase+rate/r)%1;
 for(let ch=0;ch<output.length;ch++){const c=Math.min(ch,1),x=samples[c];let y=x;
 if(t==='deesser'){const removed=(x-this.low[c])*(1-gain);y=listen?removed:x-removed;}
 else if(t==='vocoder'){this.low[c]+=(1-Math.exp(-2*Math.PI*p.vocTone/r))*(vocoded-this.low[c]);y=x+(this.low[c]-x)*p.vocMix/100;}
 else if(t==='filter'){let wet=x;for(const f of this.filters){const [b0,b1,b2,a1,a2]=f.c,s=f.state[c],z=b0*wet+s[0];s[0]=b1*wet-a1*z+s[1];s[1]=b2*wet-a2*z;wet=z;}y=x+(wet-x)*p.flMix/100;}
 else if(t==='autopan'){const pan=Math.sin(2*Math.PI*this.phase)*p.apDepth/100,wet=x*Math.sqrt(Math.max(0,1+(c?1:-1)*pan));y=x+(wet-x)*p.apMix/100;}
 else if(t==='doubler'){const buffer=this.delay[c],offset=(20+c*8*p.dblWidth/100+(2**(p.dblDetune/1200)-1)/(2*Math.PI*.5)*1000*Math.sin(2*Math.PI*(this.phase+c*.5*p.dblWidth/100)))*r/1000,read=(this.pos-offset+buffer.length)%buffer.length,k=Math.floor(read),wet=buffer[k]*(1-read+k)+buffer[(k+1)%buffer.length]*(read-k);buffer[this.pos]=x;y=x+(wet-x)*p.dblMix/100;}
 else if(t==='bitcrusher')y=x+(this.held[c]-x)*p.bitMix/100;
 else if(t==='saturation'||t==='distortion'){const shaped=t==='saturation'?Math.tanh(x*drive)/Math.tanh(drive):distortionShape(x,drive,p.distMode);this.low[c]+=tone*(shaped-this.low[c]);y=(x+(this.low[c]-x)*mix)*db(p[prefix+'Output']);}
 else if(t==='chorus'||t==='flanger'){const chorus=t==='chorus',buffer=this.delay[c],lfo=Math.sin(2*Math.PI*(this.phase+c*.25)),depth=p[t+'Depth'],ms=(chorus?15:4)+depth*lfo,offset=clamp(ms*r/1000,2,buffer.length-2),read=(this.pos-offset+buffer.length)%buffer.length,k=Math.floor(read),wet=buffer[k]*(1-read+k)+buffer[(k+1)%buffer.length]*(read-k);buffer[this.pos]=x+(chorus?0:wet*p.flangerFeedback/100);y=x+(wet-x)*p[t+'Mix']/100;}
 else if(t==='phaser'){const freq=200+((Math.sin(2*Math.PI*(this.phase+c*.15))+1)/2)*p.phaserDepth/100*5000,k=Math.tan(Math.PI*freq/r),a=(1-k)/(1+k);let z=x+this.feedback[c]*p.phaserFeedback/100;for(let n=0;n<6;n++){const v=-a*z+this.allpass[c][n];this.allpass[c][n]=z+a*v;z=v;}this.feedback[c]=z;y=x+(z-x)*p.phaserMix/100;}
 else if(t==='tr1176'||t==='tr2a')y=x*gain;
 else if(t==='trultec'){for(const filter of this.filters){const [b0,b1,b2,a1,a2]=filter.c,s=filter.state[c],v=b0*y+s[0];s[0]=b1*y-a1*v+s[1];s[1]=b2*y-a2*v;y=v;}y*=db(p.tlOutput);}
 else if(t==='clipper'){const ceiling=db(p.clipThreshold),abs=Math.abs(x);y=Math.round(p.clipMode)?clamp(x,-ceiling,ceiling):Math.sign(x)*(abs<=ceiling*.75?abs:ceiling*.75+ceiling*.25*Math.tanh((abs-ceiling*.75)/(ceiling*.25)));y*=db(p.clipOutput);}
 output[ch][i]=Number.isFinite(y)?y:0;
 }this.pos=(this.pos+1)%this.delay[0].length;
 }return maxReduction;}
}
