import {EQ_FREQUENCIES} from './effect-parameters.js';
export const EQ_TYPES=['Disabled','Low Pass','Band Pass','High Pass','Band Stop','Low Shelf','Peaking','High Shelf'];
export const EQ_KEYS=Array.from({length:7},(_,i)=>['Frequency','Gain','Q','Type','Order'].map(key=>`eq${i+1}${key}`)).flat();
export const qToPercent=q=>Math.max(0,Math.min(100,Math.log(q/.1)/Math.log(180)*100));
export const percentToQ=percent=>.1*180**(Math.max(0,Math.min(100,percent))/100);
export function bandSettings(params,band){return {frequency:params[`eq${band}Frequency`]??EQ_FREQUENCIES[band-1],gain:params[`eq${band}Gain`]??0,q:params[`eq${band}Q`]??1,type:Math.round(params[`eq${band}Type`]??6),order:Math.max(1,Math.min(10,Math.round(params[`eq${band}Order`]??1)))};}
export function resetBand(band){return {[`eq${band}Frequency`]:EQ_FREQUENCIES[band-1],[`eq${band}Gain`]:0,[`eq${band}Q`]:1,[`eq${band}Type`]:6,[`eq${band}Order`]:1};}
function biquad(type,frequency,gain,q,rate){
 const w=2*Math.PI*Math.max(5,Math.min(rate*.49,frequency))/rate,c=Math.cos(w),s=Math.sin(w),a=s/(2*Math.max(.01,q)),A=10**(gain/40),root=Math.sqrt(A);let b0,b1,b2,a0,a1,a2;
 if(type===1){b0=(1-c)/2;b1=1-c;b2=b0;a0=1+a;a1=-2*c;a2=1-a;}
 if(type===3){b0=(1+c)/2;b1=-(1+c);b2=b0;a0=1+a;a1=-2*c;a2=1-a;}
 if(type===2){b0=a;b1=0;b2=-a;a0=1+a;a1=-2*c;a2=1-a;}
 if(type===4){b0=1;b1=-2*c;b2=1;a0=1+a;a1=-2*c;a2=1-a;}
 if(type===6){b0=1+a*A;b1=-2*c;b2=1-a*A;a0=1+a/A;a1=-2*c;a2=1-a/A;}
 if(type===5){b0=A*((A+1)-(A-1)*c+2*root*a);b1=2*A*((A-1)-(A+1)*c);b2=A*((A+1)-(A-1)*c-2*root*a);a0=(A+1)+(A-1)*c+2*root*a;a1=-2*((A-1)+(A+1)*c);a2=(A+1)+(A-1)*c-2*root*a;}
 if(type===7){b0=A*((A+1)+(A-1)*c+2*root*a);b1=-2*A*((A-1)+(A+1)*c);b2=A*((A+1)+(A-1)*c-2*root*a);a0=(A+1)-(A-1)*c+2*root*a;a1=2*((A-1)-(A+1)*c);a2=(A+1)-(A-1)*c-2*root*a;}
 return [b0/a0,b1/a0,b2/a0,a1/a0,a2/a0];
}
export function bandCoefficients(settings,rate=48000){
 const {type,order,frequency,gain,q}=settings;if(!type)return [];
 if(type===1||type===3){const stages=[];if(order%2){const k=Math.tan(Math.PI*Math.min(frequency,rate*.49)/rate),a=1/(1+k);stages.push(type===1?[k*a,k*a,0,(k-1)*a,0]:[a,-a,0,(k-1)*a,0]);}for(let i=0;i<Math.floor(order/2);i++){const angle=order%2?Math.PI*(i+1)/order:Math.PI*(2*i+1)/(2*order),Q=q/(2*Math.cos(angle));stages.push(biquad(type,frequency,0,Q,rate));}return stages;}
 return Array.from({length:order},()=>biquad(type,frequency,gain/order,q*(type>=5?Math.sqrt(order):1),rate));
}
export function coefficientsForEq(params,rate=48000,solo=0){
 if(solo){const settings=bandSettings(params,solo);return settings.type?bandCoefficients({...settings,type:2,order:1,gain:0},rate):[];}
 return Array.from({length:7},(_,i)=>bandCoefficients(bandSettings(params,i+1),rate)).flat();
}
export function eqResponse(params,frequency,rate=48000,solo=0){return responseForCoefficients(coefficientsForEq(params,rate,solo),frequency,rate);}
export function responseForCoefficients(coefficients,frequency,rate=48000){const angle=2*Math.PI*Math.min(rate*.499,frequency)/rate,c=Math.cos(angle),s=Math.sin(angle),c2=Math.cos(2*angle),s2=Math.sin(2*angle);let db=0;for(const [b0,b1,b2,a1,a2]of coefficients){const nr=b0+b1*c+b2*c2,ni=-b1*s-b2*s2,dr=1+a1*c+a2*c2,di=-a1*s-a2*s2;db+=10*Math.log10(Math.max(1e-30,(nr*nr+ni*ni)/(dr*dr+di*di)));}return db;}
export class EqProcessor{
 constructor(rate){this.rate=rate;this.stages=[];this.signature='';this.structure='';}
 configure(params,solo=0){const signature=EQ_KEYS.map(key=>params[key]).join(',')+':'+solo;if(signature===this.signature)return;this.signature=signature;const structure=Array.from({length:7},(_,i)=>{const s=bandSettings(params,i+1);return s.type+':'+s.order;}).join(',')+':'+solo,reuse=structure===this.structure;this.structure=structure;const coefficients=coefficientsForEq(params,this.rate,solo);this.stages=coefficients.map((target,i)=>({c:reuse&&this.stages[i]?.c||target.slice(),target,state:reuse&&this.stages[i]?.state||[new Float64Array(2),new Float64Array(2)]}));}
 process(input,output){const length=output[0].length;for(const stage of this.stages){if(!stage.delta)stage.delta=new Float64Array(5);for(let k=0;k<5;k++)stage.delta[k]=(stage.target[k]-stage.c[k])/length;};for(let i=0;i<length;i++){for(const stage of this.stages)for(let k=0;k<5;k++)stage.c[k]+=stage.delta[k];for(let ch=0;ch<output.length;ch++){let x=(input[ch]||input[0])?.[i]||0;for(const stage of this.stages){const [b0,b1,b2,a1,a2]=stage.c,state=stage.state[Math.min(ch,1)],y=b0*x+state[0];state[0]=b1*x-a1*y+state[1];state[1]=b2*x-a2*y;x=y;if(!Number.isFinite(x)){state.fill(0);x=0;}}output[ch][i]=x;}}for(const stage of this.stages){for(let k=0;k<5;k++)stage.c[k]=stage.target[k];};}
}
