class LatencyCapture extends AudioWorkletProcessor{process(inputs){const data=inputs[0]?.[0];if(data)this.port.postMessage({frame:currentFrame,data:data.slice()});return true;}}
registerProcessor('latency-capture',LatencyCapture);
