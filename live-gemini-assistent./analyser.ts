/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Analyser class for live audio visualisation.
 */
export class Analyser {
  private analyser: AnalyserNode;
  private bufferLength = 0;
  private dataArray: Uint8Array;
  
  // Expose data property for visual-3d.ts to access
  get data(): Uint8Array {
    return this.dataArray;
  }

  constructor(node: AudioNode) {
    this.analyser = node.context.createAnalyser();
    this.analyser.fftSize = 32;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    node.connect(this.analyser);
  }

  getFrequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  getBufferLength(): number {
    return this.bufferLength;
  }

  setMinDecibels(value: number) {
    this.analyser.minDecibels = value;
  }

  setMaxDecibels(value: number) {
    this.analyser.maxDecibels = value;
  }

  setSmoothingTimeConstant(value: number) {
    this.analyser.smoothingTimeConstant = value;
  }

  setFftSize(value: number) {
    this.analyser.fftSize = value;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
  }

  update() {
    // Update method that visual-3d.ts expects
    this.analyser.getByteFrequencyData(this.dataArray);
  }
}