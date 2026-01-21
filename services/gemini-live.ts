import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, base64ToBytes, decodeAudioData } from '../utils/audio-utils';
import { LiveConfig } from '../types';

export class GeminiLiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputGain: GainNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  
  // Analysers for visualization
  public userAnalyser: AnalyserNode | null = null;
  public aiAnalyser: AnalyserNode | null = null;

  // Track connection state
  private session: any = null;
  private sessionPromise: Promise<any> | null = null;
  
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(config: LiveConfig, onDisconnect: () => void, onError: (e: Error) => void) {
    try {
      // 1. Setup Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 2. Setup Analysers for Visualization
      this.userAnalyser = this.inputAudioContext.createAnalyser();
      this.userAnalyser.fftSize = 256;
      this.userAnalyser.smoothingTimeConstant = 0.5;

      this.aiAnalyser = this.outputAudioContext.createAnalyser();
      this.aiAnalyser.fftSize = 256;
      this.aiAnalyser.smoothingTimeConstant = 0.5;

      this.outputGain = this.outputAudioContext.createGain();
      this.outputGain.connect(this.aiAnalyser);
      this.aiAnalyser.connect(this.outputAudioContext.destination);

      // 3. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
      this.inputSource.connect(this.userAnalyser);

      // 4. Setup Input Processing (ScriptProcessor)
      // Note: ScriptProcessor is deprecated but widely supported and easier for single-file demos than AudioWorklet
      this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        if (this.sessionPromise) {
          this.sessionPromise.then(session => {
             // Send audio chunk
             session.sendRealtimeInput({ media: pcmBlob });
          }).catch(err => {
            // Session might be closed
            console.warn("Failed to send audio", err);
          });
        }
      };
      
      this.userAnalyser.connect(this.processor);
      this.processor.connect(this.inputAudioContext.destination);

      // 5. Connect to Gemini Live
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
          },
          systemInstruction: config.systemInstruction,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connection Opened");
          },
          onmessage: async (message: LiveServerMessage) => {
            const serverContent = message.serverContent;
            
            // Handle Interruption
            if (serverContent?.interrupted) {
              this.stopAllSources();
              this.nextStartTime = 0;
            }

            // Handle Audio Data
            const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext && this.outputGain) {
               try {
                 const pcmData = base64ToBytes(base64Audio);
                 const audioBuffer = await decodeAudioData(
                   pcmData, 
                   this.outputAudioContext, 
                   24000, 
                   1
                 );
                 
                 this.scheduleAudioChunk(audioBuffer);
               } catch (err) {
                 console.error("Error decoding audio", err);
               }
            }
          },
          onclose: () => {
            console.log("Gemini Live Connection Closed");
            onDisconnect();
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            onError(new Error(err.message || "Unknown Live API Error"));
          }
        }
      });
      
      // Wait for session to be established
      this.session = await this.sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      this.disconnect();
      onError(error instanceof Error ? error : new Error("Failed to connect"));
    }
  }

  private scheduleAudioChunk(buffer: AudioBuffer) {
    if (!this.outputAudioContext || !this.outputGain) return;

    // Schedule playback
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputGain);

    // Ensure we don't schedule in the past
    const currentTime = this.outputAudioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;

    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
    };
  }

  private stopAllSources() {
    this.sources.forEach(source => {
      try {
        source.stop();
      } catch (e) { /* ignore already stopped */ }
    });
    this.sources.clear();
  }

  disconnect() {
    this.stopAllSources();

    if (this.session) {
      // Trying to close session cleanly if method exists, otherwise just drop
      try {
         // The SDK might not expose a close method directly on the session object 
         // depending on version, but usually we just stop sending/receiving.
         // We rely on garbage collection and context closing.
         // However, the prompt mentions `session.close()` in rules, but `live.connect` returns a promise.
         // We will assume simply closing contexts is enough to kill the stream from client side.
         // Actually, let's check if the session object has a close.
         (this.session as any).close?.(); 
      } catch (e) {
        console.warn("Error closing session", e);
      }
    }
    
    this.session = null;
    this.sessionPromise = null;

    this.processor?.disconnect();
    this.inputSource?.disconnect();
    this.userAnalyser?.disconnect();
    this.aiAnalyser?.disconnect();
    this.outputGain?.disconnect();

    this.inputAudioContext?.close();
    this.outputAudioContext?.close();

    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.processor = null;
    this.inputSource = null;
  }
}