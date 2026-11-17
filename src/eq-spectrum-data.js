export function spectrumDb(samples){
 const n=samples.length,real=new Float64Array(n),imag=new Float64Array(n);for(let i=0;i<n;i++)real[i]=samples[i]*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){const temp=real[i];real[i]=real[j];real[j]=temp;}}
 for(let length=2;length<=n;length*=2){const angle=-2*Math.PI/length;for(let base=0;base<n;base+=length)for(let j=0;j<length/2;j++){const c=Math.cos(angle*j),s=Math.sin(angle*j),at=base+j+length/2,re=real[at]*c-imag[at]*s,im=real[at]*s+imag[at]*c;real[at]=real[base+j]-re;imag[at]=imag[base+j]-im;real[base+j]+=re;imag[base+j]+=im;}}
 return Float32Array.from({length:n/2},(_,i)=>20*Math.log10(Math.max(1e-9,Math.hypot(real[i],imag[i])*4/n)));
}
export function clipSpectrum(buffer,offset=0,duration=buffer?.duration||0){
 if(!buffer)return null;const n=4096,result=new Float32Array(n/2).fill(-180),windows=4;
 for(let window=0;window<windows;window++){const start=Math.max(0,Math.floor((offset+Math.max(0,duration-n/buffer.sampleRate)*window/(windows-1))*buffer.sampleRate));for(let ch=0;ch<buffer.numberOfChannels;ch++){const samples=new Float32Array(n),data=buffer.getChannelData(ch);for(let i=0;i<n;i++)samples[i]=start+i<Math.min(data.length,Math.floor((offset+duration)*buffer.sampleRate))?(data[start+i]||0):0;const db=spectrumDb(samples);for(let i=0;i<db.length;i++)result[i]=Math.max(result[i],db[i]);}}return result;
}
