import { base64ToUint8Array, decodeAudioData } from './utils';

export class AudioStreamer {
  private context: AudioContext;
  private gainNode: GainNode;
  private nextStartTime: number = 0;
  private processingQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000, // Gemini Native Audio output rate
    });
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
  }

  public setVolume(val: number) {
    if (this.gainNode) {
        this.gainNode.gain.value = val;
    }
  }

  public async addPCM16(chunk: string) {
    // Chain the processing to ensure order
    this.processingQueue = this.processingQueue.then(() => this.processChunk(chunk));
  }

  private async processChunk(chunk: string) {
    // Ensure AudioContext is running (browsers suspend it until user interaction)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    const data = base64ToUint8Array(chunk);
    const audioBuffer = await decodeAudioData(data, this.context, 24000);
    
    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const now = this.context.currentTime;
    
    // Gapless playback logic:
    // If our "next start time" is in the past (we fell behind), catch up to now.
    // Add a tiny buffer (50ms) to 'now' to ensure we don't schedule slightly in the past 
    // due to execution latency, which causes the browser to drop the audio frame.
    if (this.nextStartTime < now) {
      this.nextStartTime = now + 0.05;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }
  
  public stop() {
    // Suspending is more efficient than closing for pauses
    this.context.suspend();
    this.nextStartTime = 0;
  }
  
  public async resume() {
    if (this.context.state === 'suspended') {
        await this.context.resume();
    }
  }
}