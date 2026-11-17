export const stereoSeparation=channel=>channel.stereoSeparation??((channel.stereoWidth??1)-1)*100;
export function stereoCoefficients(channel){const width=1+stereoSeparation(channel)/100,polarity=channel.invertPolarity?-1:1,a=(1+width)*.5*polarity,b=(1-width)*.5*polarity;return channel.swapChannels?[b,a,a,b]:[a,b,b,a];}
export function updateStereoMatrix(matrix,channel,time=0){if(!matrix)return;const coefficients=stereoCoefficients(channel);matrix.gains.forEach((node,i)=>{const param=node.gain;if(param.setTargetAtTime)param.setTargetAtTime(coefficients[i],time,.015);else param.value=coefficients[i];});}
export function createStereoMatrix(ctx,input,channel,nodes){
 if(!ctx.createChannelSplitter||!ctx.createChannelMerger){if(stereoSeparation(channel)!==0||channel.swapChannels||channel.invertPolarity)throw Error('Stereo processing is unavailable');return null;}
 const split=ctx.createChannelSplitter(2),merge=ctx.createChannelMerger(2),gains=Array.from({length:4},()=>ctx.createGain());input.connect(split);for(let out=0;out<2;out++)for(let source=0;source<2;source++){const gain=gains[out*2+source];split.connect(gain,source);gain.connect(merge,0,out);}nodes.push(split,merge,...gains);const matrix={output:merge,gains};const coefficients=stereoCoefficients(channel);gains.forEach((gain,i)=>gain.gain.value=coefficients[i]);return matrix;
}

export function stereoAutomationBindings(matrix,channel){if(!matrix)return [];const a=stereoCoefficients({...channel,stereoSeparation:0}),b=stereoCoefficients({...channel,stereoSeparation:100});return matrix.gains.map((node,i)=>({param:node.gain,scale:(b[i]-a[i])/100,offset:a[i]}));}
