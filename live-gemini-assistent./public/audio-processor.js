// Audio Worklet Processor for real-time audio processing
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 256;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (!input || !input[0]) {
      return true;
    }

    const inputChannel = input[0];
    
    // Copy input data and send via message when buffer is full
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];
      
      if (this.bufferIndex >= this.bufferSize) {
        // Send the buffer to the main thread
        this.port.postMessage({
          type: 'audio-data',
          data: new Float32Array(this.buffer)
        });
        
        // Reset buffer
        this.bufferIndex = 0;
      }
    }
    
    // Copy input to output to maintain audio passthrough
    const output = outputs[0];
    if (output && output[0]) {
      output[0].set(inputChannel);
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);