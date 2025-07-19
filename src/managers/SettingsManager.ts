import type { SettingsData } from '../types/GameTypes';

export class SettingsManager {
  private settings: SettingsData;
  private readonly STORAGE_KEY = 'aim-trainer-settings';

  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadSettings();
  }

  private getDefaultSettings(): SettingsData {
    return {
      mouseSensitivity: 1.0,
      audioEnabled: true,
      masterVolume: 0.5,
      targetSize: 1.0,
      difficulty: 'normal',
      qualityLevel: 'auto',
      autoAdjustQuality: true,
      targetFps: 60
    };
  }

  loadSettings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        // Merge with defaults to handle new settings
        this.settings = { ...this.getDefaultSettings(), ...parsedSettings };
        this.validateSettings();
      }
    } catch (error) {
      this.settings = this.getDefaultSettings();
    }
  }

  saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      // Ignore save errors
    }
  }

  getSetting<K extends keyof SettingsData>(key: K): SettingsData[K] {
    return this.settings[key];
  }

  setSetting<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void {
    this.settings[key] = value;
    this.validateSettings();
    this.saveSettings();
  }

  getAllSettings(): SettingsData {
    return { ...this.settings };
  }

  resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }

  private validateSettings(): void {
    // Clamp mouse sensitivity between 0.1 and 5.0
    this.settings.mouseSensitivity = Math.max(0.1, Math.min(5.0, this.settings.mouseSensitivity));
    
    // Clamp master volume between 0.0 and 1.0
    this.settings.masterVolume = Math.max(0.0, Math.min(1.0, this.settings.masterVolume));
    
    // Ensure boolean values
    this.settings.audioEnabled = Boolean(this.settings.audioEnabled);
    this.settings.autoAdjustQuality = Boolean(this.settings.autoAdjustQuality);
    
    // Clamp target size
    this.settings.targetSize = Math.max(0.5, Math.min(2.0, this.settings.targetSize));
    
    // Validate quality level
    const validQualityLevels = ['low', 'medium', 'high', 'auto'];
    if (!validQualityLevels.includes(this.settings.qualityLevel)) {
      this.settings.qualityLevel = 'auto';
    }
    
    // Validate target FPS
    const validFpsValues = [30, 60, 120];
    if (!validFpsValues.includes(this.settings.targetFps)) {
      this.settings.targetFps = 60;
    }
  }
}