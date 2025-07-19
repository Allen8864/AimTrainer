import { SettingsManager } from '../managers/SettingsManager';
import type { AudioManager } from '../managers/AudioManager';

export class SettingsUI {
  private settingsManager: SettingsManager;
  private audioManager: AudioManager | null = null;
  private settingsPanel!: HTMLElement;
  private sensitivitySlider!: HTMLInputElement;
  private sensitivityValue!: HTMLElement;
  private audioToggle!: HTMLInputElement;
  private volumeSlider!: HTMLInputElement;
  private volumeValue!: HTMLElement;
  private closeButton!: HTMLElement;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
    
    this.initializeElements();
    this.bindEvents();
    this.updateUI();
  }

  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
  }

  private initializeElements(): void {
    this.settingsPanel = document.getElementById('settings-panel')!;
    this.sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    this.sensitivityValue = document.getElementById('sensitivity-value')!;
    this.audioToggle = document.getElementById('audio-toggle') as HTMLInputElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.volumeValue = document.getElementById('volume-value')!;
    this.closeButton = document.getElementById('close-settings')!;

    if (!this.settingsPanel || !this.sensitivitySlider || !this.sensitivityValue || 
        !this.audioToggle || !this.volumeSlider || !this.volumeValue || !this.closeButton) {
      throw new Error('Settings UI elements not found in DOM');
    }
  }

  private bindEvents(): void {
    // Mouse sensitivity slider
    this.sensitivitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.settingsManager.setSetting('mouseSensitivity', value);
      this.updateSensitivityDisplay(value);
    });

    // Audio toggle
    this.audioToggle.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.settingsManager.setSetting('audioEnabled', enabled);
      
      // Notify audio manager of the change
      if (this.audioManager) {
        this.audioManager.toggleAudio(enabled);
      }
    });

    // Volume slider
    this.volumeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.settingsManager.setSetting('masterVolume', value);
      this.updateVolumeDisplay(value);
      
      // Notify audio manager of the change
      if (this.audioManager) {
        this.audioManager.setMasterVolume(value);
      }
    });

    // Close button
    this.closeButton.addEventListener('click', () => {
      this.hide();
    });
  }

  private updateUI(): void {
    const settings = this.settingsManager.getAllSettings();
    
    // Update sensitivity
    this.sensitivitySlider.value = settings.mouseSensitivity.toString();
    this.updateSensitivityDisplay(settings.mouseSensitivity);
    
    // Update audio settings
    this.audioToggle.checked = settings.audioEnabled;
    this.volumeSlider.value = settings.masterVolume.toString();
    this.updateVolumeDisplay(settings.masterVolume);
  }

  private updateSensitivityDisplay(value: number): void {
    this.sensitivityValue.textContent = value.toFixed(1);
  }

  private updateVolumeDisplay(value: number): void {
    this.volumeValue.textContent = `${Math.round(value * 100)}%`;
  }

  show(): void {
    this.settingsPanel.classList.remove('hidden');
    this.updateUI(); // Refresh UI when showing
  }

  hide(): void {
    this.settingsPanel.classList.add('hidden');
  }

  isVisible(): boolean {
    return !this.settingsPanel.classList.contains('hidden');
  }

  toggle(): void {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }
}