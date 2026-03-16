import { arrayBufferToBase64 } from './utils';

export class AudioRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onDataCallback: (base64: string) => void;
  private isMuted: boolean = false;
  private isRecording: boolean = false;

  constructor(onData: (base64: string) => void) {
    this.onDataCallback = onData;
  }

  public async start() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media Devices API not supported');
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) throw new Error('AudioContext not supported');

      this.context = new AudioContextClass({
        sampleRate: 16000, // Gemini prefers 16kHz input
      });

      // Request permission. This will throw if denied.
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Safety check: ensure we weren't stopped while waiting for permission
      if (!this.context || this.context.state === 'closed') {
          throw new Error('AudioContext closed during initialization');
      }

      this.source = this.context.createMediaStreamSource(this.stream);
      
      // Using ScriptProcessorNode for simplicity. 
      this.processor = this.context.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || !this.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Downsample/Convert Float32 to Int16
        const l = inputData.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
           // Clamp values between -1 and 1
           const s = Math.max(-1, Math.min(1, inputData[i]));
           // Convert to 16-bit integer
           int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const base64 = arrayBufferToBase64(int16.buffer);
        this.onDataCallback(base64);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.context.destination);
      this.isRecording = true;

    } catch (error) {
      console.error('Error starting audio recorder:', error);
      // Ensure we clean up if we partially initialized
      this.stop();
      throw error;
    }
  }

  public stop() {
    this.isRecording = false;

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.processor) {
      this.processor.disconnect();
    }
    if (this.source) {
      this.source.disconnect();
    }
    if (this.context && this.context.state !== 'closed') {
      this.context.close();
    }
    this.stream = null;
    this.processor = null;
    this.source = null;
    this.context = null;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }
}