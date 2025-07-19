import type { SettingsManager } from './SettingsManager';

export type SoundType = 'gunshot' | 'hit' | 'miss' | 'milestone';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private settingsManager: SettingsManager;
  private isInitialized: boolean = false;
  private isEnabled: boolean = true;
  private masterVolume: number = 0.5;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
    this.loadSettings();
  }

  private loadSettings(): void {
    this.isEnabled = this.settingsManager.getSetting('audioEnabled');
    this.masterVolume = this.settingsManager.getSetting('masterVolume');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || !this.isEnabled) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load all sound effects
      await this.loadSounds();
      
      this.isInitialized = true;
      console.log('AudioManager initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize AudioManager:', error);
      this.isInitialized = false;
    }
  }

  private async loadSounds(): Promise<void> {
    if (!this.audioContext) return;

    // Create synthetic sound effects since we don't have audio files
    const sounds: { [key in SoundType]: () => AudioBuffer } = {
      gunshot: () => this.createGunshotSound(),
      hit: () => this.createHitSound(),
      miss: () => this.createMissSound(),
      milestone: () => this.createMilestoneSound()
    };

    for (const [soundType, createSound] of Object.entries(sounds)) {
      try {
        const buffer = createSound();
        this.sounds.set(soundType as SoundType, buffer);
      } catch (error) {
        console.warn(`Failed to create ${soundType} sound:`, error);
      }
    }
  }

  private createGunshotSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3; // 300ms
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Create a gunshot-like sound with noise and envelope
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 15); // Sharp decay
      const noise = (Math.random() * 2 - 1) * envelope;
      const lowFreq = Math.sin(2 * Math.PI * 80 * t) * envelope * 0.3;
      data[i] = (noise * 0.7 + lowFreq) * 0.8;
    }

    return buffer;
  }

  private createHitSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2; // 200ms
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Create a pleasant hit confirmation sound
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8);
      const freq1 = Math.sin(2 * Math.PI * 800 * t) * envelope;
      const freq2 = Math.sin(2 * Math.PI * 1200 * t) * envelope * 0.5;
      data[i] = (freq1 + freq2) * 0.6;
    }

    return buffer;
  }

  private createMissSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15; // 150ms
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Create a subtle miss sound
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 6);
      const freq = Math.sin(2 * Math.PI * 300 * t) * envelope;
      data[i] = freq * 0.3;
    }

    return buffer;
  }

  private createMilestoneSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5; // 500ms
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Create a celebratory milestone sound
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3);
      const freq1 = Math.sin(2 * Math.PI * 523 * t) * envelope; // C5
      const freq2 = Math.sin(2 * Math.PI * 659 * t) * envelope; // E5
      const freq3 = Math.sin(2 * Math.PI * 784 * t) * envelope; // G5
      data[i] = (freq1 + freq2 + freq3) * 0.4;
    }

    return buffer;
  }

  async playSound(soundType: SoundType, volume: number = 1.0): Promise<void> {
    if (!this.isEnabled || !this.isInitialized || !this.audioContext) {
      return;
    }

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
        return;
      }
    }

    const buffer = this.sounds.get(soundType);
    if (!buffer) {
      console.warn(`Sound ${soundType} not found`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Apply volume settings
      const finalVolume = Math.max(0, Math.min(1, volume * this.masterVolume));
      gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
      
      source.start();
    } catch (error) {
      console.warn(`Failed to play sound ${soundType}:`, error);
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.settingsManager.setSetting('masterVolume', this.masterVolume);
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  toggleAudio(enabled: boolean): void {
    this.isEnabled = enabled;
    this.settingsManager.setSetting('audioEnabled', enabled);
    
    if (enabled && !this.isInitialized) {
      // Initialize audio when enabled
      this.initialize().catch(error => {
        console.warn('Failed to initialize audio after enabling:', error);
      });
    }
  }

  isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  updateSettings(): void {
    this.loadSettings();
  }

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(error => {
        console.warn('Error closing audio context:', error);
      });
      this.audioContext = null;
    }
    
    this.sounds.clear();
    this.isInitialized = false;
  }
}