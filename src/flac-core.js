// Assemble native FLAC without the vendor's CommonJS/AMD utility wrappers.
export function assembleFlac(chunks,metadata){
 const size=chunks.reduce((sum,chunk)=>sum+chunk.length,0),bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 if(bytes.length<42||String.fromCharCode(...bytes.subarray(0,4))!=='fLaC'||(bytes[4]&127)!==0)throw Error('Invalid FLAC encoder header');
 if(metadata){const view=new DataView(bytes.buffer),uint24=(offset,value)=>{bytes[offset]=(value>>>16)&255;bytes[offset+1]=(value>>>8)&255;bytes[offset+2]=value&255;};uint24(12,metadata.min_framesize||0);uint24(15,metadata.max_framesize||0);const total=metadata.total_samples||0;bytes[21]=(bytes[21]&240)|(Math.floor(total/4294967296)&15);view.setUint32(22,total>>>0,false);if(/^[0-9a-f]{32}$/i.test(metadata.md5sum||''))for(let i=0;i<16;i++)bytes[26+i]=parseInt(metadata.md5sum.slice(i*2,i*2+2),16);}
 return bytes;
}
export async function encodeFlac(Flac,channels,sampleRate,bits=24,level=5){
 const chunks=[];let metadata;const encoder=Flac.create_libflac_encoder(sampleRate,channels.length,bits,level,channels[0].length,true,0);if(!encoder)throw Error('Could not create FLAC encoder');
 try{
  if(Flac.init_encoder_stream(encoder,data=>chunks.push(data.slice()),data=>{metadata=data;})!==0)throw Error('Could not initialize FLAC encoder');
  for(let at=0;at<channels[0].length;at+=16384){const frames=Math.min(16384,channels[0].length-at),pcm=new Int32Array(frames*channels.length);for(let i=0;i<frames;i++)for(let ch=0;ch<channels.length;ch++){const value=Math.max(-1,Math.min(1,channels[ch][at+i]));pcm[i*channels.length+ch]=Math.round(value*(value<0?2**(bits-1):2**(bits-1)-1));}if(!Flac.FLAC__stream_encoder_process_interleaved(encoder,pcm,frames))throw Error('FLAC encoding failed');}
  if(!Flac.FLAC__stream_encoder_finish(encoder))throw Error('FLAC finalization failed');return assembleFlac(chunks,metadata);
 }finally{Flac.FLAC__stream_encoder_delete(encoder);}
}
