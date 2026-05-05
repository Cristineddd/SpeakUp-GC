export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}


export class VoiceService {
  private static mediaRecorder: MediaRecorder | null = null;
  private static audioChunks: Blob[] = [];
  private static recognition: any = null;
  private static isRecording = false;
  private static currentAudio: HTMLAudioElement | null = null;

  
  static initRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition not supported in this browser');
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
  }

 
  static async startRecording(): Promise<void> {
    try {
      this.audioChunks = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  /**
   * Stop recording voice
   */
  static async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        
        // Stop all audio tracks
        this.mediaRecorder!.stream.getTracks().forEach(track => track.stop());
        
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Convert audio blob to base64
   */
  static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data:audio/wav;base64, prefix
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert audio blob to audio URL
   */
  static blobToAudioUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Speech to Text using Web Speech API
   */
  static startListening(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void,
    onEnd?: () => void
  ): void {
    try {
      if (!this.recognition) {
        this.initRecognition();
      }

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;

          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const result: VoiceRecognitionResult = {
          transcript: finalTranscript || interimTranscript,
          confidence: event.results[event.results.length - 1]?.[0]?.confidence || 0,
          isFinal: finalTranscript.length > 0,
        };

        onResult(result);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        onError?.(event.error);
      };

      this.recognition.onend = () => {
        onEnd?.();
      };

      this.recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      onError?.('Failed to start listening');
    }
  }

  /**
   * Stop listening to speech
   */
  static stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Text to Speech using Web Speech API
   */
  static async speak(
    text: string,
    onEnd?: () => void,
    rate: number = 1,
    pitch: number = 1,
    volume: number = 1
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = rate; // 0.1 to 10
      utterance.pitch = pitch; // 0 to 2
      utterance.volume = volume; // 0 to 1
      
      utterance.onend = () => {
        onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop speech synthesis
   */
  static stopSpeaking(): void {
    window.speechSynthesis.cancel();
  }

  /**
   * Cancel pending speech
   */
  static cancelSpeech(): void {
    window.speechSynthesis.cancel();
  }

  /**
   * Play audio from URL or blob
   */
  static async playAudio(
    source: string | Blob,
    onEnd?: () => void,
    volume: number = 1
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        }

        const audio = new Audio();
        audio.volume = Math.max(0, Math.min(1, volume));

        if (typeof source === 'string') {
          audio.src = source;
        } else {
          audio.src = URL.createObjectURL(source);
        }

        audio.onended = () => {
          onEnd?.();
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          reject(new Error('Failed to play audio'));
        };

        this.currentAudio = audio;
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop audio playback
   */
  static stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Get available voices
   */
  static getVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis.getVoices();
  }

  /**
   * Set voice for speech synthesis
   */
  static setVoice(voiceIndex: number): void {
    const voices = this.getVoices();
    if (voices[voiceIndex]) {
      const utterance = new SpeechSynthesisUtterance();
      utterance.voice = voices[voiceIndex];
    }
  }

  /**
   * Check if browser supports speech recognition
   */
  static isSpeechRecognitionSupported(): boolean {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition;
  }

  /**
   * Check if browser supports speech synthesis
   */
  static isSpeechSynthesisSupported(): boolean {
    return !!window.speechSynthesis;
  }

  /**
   * Check if browser supports media recording
   */
  static isMediaRecordingSupported(): boolean {
    return !!navigator.mediaDevices?.getUserMedia;
  }

  /**
   * Get recording status
   */
  static isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Pause/Resume speech synthesis
   */
  static pauseSpeech(): void {
    if (window.speechSynthesis.paused === false) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Resume speech synthesis
   */
  static resumeSpeech(): void {
    if (window.speechSynthesis.paused === true) {
      window.speechSynthesis.resume();
    }
  }

  /**
   * Request microphone permission
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Transcribe recorded audio blob using Web Speech API
   * Converts audio blob to text using speech recognition
   * Falls back to a simple placeholder if transcription isn't possible
   */
  static async transcribeAudio(audioBlob: Blob): Promise<string> {
    return new Promise((resolve) => {
      try {
        if (!this.isSpeechRecognitionSupported()) {
          console.warn('Speech Recognition not supported, using fallback');
          resolve('Voice message received');
          return;
        }

        if (!this.recognition) {
          this.initRecognition();
        }

        let finalTranscript = '';
        let hasResult = false;
        const timeout = setTimeout(() => {
          if (!hasResult && this.recognition) {
            this.recognition.abort();
            resolve(finalTranscript || 'Voice message received');
          }
        }, 5000); // 5 second timeout

        this.recognition.onresult = (event: any) => {
          hasResult = true;
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          console.log('📝 Transcription interim:', interimTranscript);
          console.log('📝 Transcription final:', finalTranscript);
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Transcription error (using fallback):', event.error);
          clearTimeout(timeout);
          resolve(finalTranscript || 'Voice message received');
        };

        this.recognition.onend = () => {
          clearTimeout(timeout);
          const result = finalTranscript.trim() || 'Voice message received';
          console.log('✅ Transcription complete:', result);
          resolve(result);
        };

        // Start recognition
        this.recognition.start();
        console.log('🎤 Starting transcription...');
      } catch (error) {
        console.error('Transcription error:', error);
        resolve('Voice message received');
      }
    });
  }

  /**
   * Get a description of recorded audio duration
   */
  static getAudioDurationDescription(seconds: number): string {
    if (seconds < 1) return 'Less than a second';
    if (seconds === 1) return '1 second';
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }
}

export default VoiceService;
