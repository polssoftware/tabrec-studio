export function attachStereoMeters(context,mix){
 for(const graph of Object.values(mix.map)){const split=context.createChannelSplitter(2),left=context.createAnalyser(),right=context.createAnalyser();left.fftSize=right.fftSize=256;graph.meter.connect(split);split.connect(left,0);split.connect(right,1);graph.stereoMeters=[left,right];graph.stereoSamples=[new Float32Array(256),new Float32Array(256)];graph.nodes.push(split,left,right);}
}
export function readStereoMeters(graph){return graph.stereoMeters.map((meter,index)=>{const data=graph.stereoSamples[index];meter.getFloatTimeDomainData(data);let peak=0;for(const sample of data)peak=Math.max(peak,Math.abs(sample));return peak;});}
