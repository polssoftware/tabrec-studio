class LocalRecorder extends AudioWorkletProcessor{
 constructor(){super();this.active=true;this.startFrame=Infinity;this.chunks=[new Float32Array(4096),new Float32Array(4096)];this.n=0;this.port.onmessage=e=>{if(e.data?.startFrame!==undefined)this.startFrame=e.data.startFrame;if(e.data==='stop'&&this.active){this.flush();this.active=false;this.port.postMessage({done:true});}};}
 flush(){if(this.n){this.port.postMessage({channels:this.chunks.map(c=>c.slice(0,this.n))});this.n=0;}}
 process(inputs){if(!this.active)return true;const input=inputs[0];if(!input?.length)return true;for(let i=0;i<input[0].length;i++){if(currentFrame+i<this.startFrame)continue;for(let c=0;c<2;c++)this.chunks[c][this.n]=input[Math.min(c,input.length-1)][i];this.n++;if(this.n===4096)this.flush();}return true;}
}registerProcessor('local-recorder',LocalRecorder);
