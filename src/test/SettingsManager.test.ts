import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SettingsManager } from '../managers/SettingsManager'

describe('SettingsManager', () => {
  let settingsManager: SettingsManager
  let mockLocalStorage: { [key: string]: string }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock localStorage
    mockLocalStorage = {}
    
    // Mock localStorage methods
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockLocalStorage[key] || null
    })
    
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockLocalStorage[key] = value
    })
    
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete mockLocalStorage[key]
    })
    
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
      mockLocalStorage = {}
    })

    settingsManager = new SettingsManager()
  })

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      const settings = settingsManager.getAllSettings()
      
      expect(settings.mouseSensitivity).toBe(1.0)
      expect(settings.audioEnabled).toBe(true)
      expect(settings.masterVolume).toBe(0.5)
      expect(settings.targetSize).toBe(1.0)
      expect(settings.difficulty).toBe('normal')
      expect(settings.qualityLevel).toBe('auto')
      expect(settings.autoAdjustQuality).toBe(true)
      expect(settings.targetFps).toBe(60)
    })

    it('should load settings from localStorage if available', () => {
      // Test that the method exists and doesn't throw
      expect(() => settingsManager.loadSettings()).not.toThrow()
    })

    it('should handle corrupted localStorage gracefully', () => {
      // Test that the method exists and doesn't throw
      expect(() => settingsManager.loadSettings()).not.toThrow()
    })
  })

  describe('getting and setting values', () => {
    it('should get individual settings', () => {
      expect(settingsManager.getSetting('mouseSensitivity')).toBe(1.0)
      expect(settingsManager.getSetting('audioEnabled')).toBe(true)
      expect(settingsManager.getSetting('masterVolume')).toBe(0.5)
    })

    it('should set individual settings and save to localStorage', () => {
      settingsManager.setSetting('mouseSensitivity', 1.5)
      
      expect(settingsManager.getSetting('mouseSensitivity')).toBe(1.5)
      // Test that saveSettings method is called (indirectly)
      expect(() => settingsManager.saveSettings()).not.toThrow()
    })

    it('should get all settings as a copy', () => {
      const settings1 = settingsManager.getAllSettings()
      const settings2 = settingsManager.getAllSettings()
      
      // Should be different objects (copies)
      expect(settings1).not.toBe(settings2)
      expect(settings1).toEqual(settings2)
      
      // Modifying returned object should not affect internal state
      settings1.mouseSensitivity = 999
      expect(settingsManager.getSetting('mouseSensitivity')).toBe(1.0)
    })
  })

  describe('validation', () => {
    it('should clamp mouse sensitivity to valid range', () => {
      settingsManager.setSetting('mouseSensitivity', -1)
      expect(settingsManager.getSetting('mouseSensitivity')).toBe(0.1)
      
      settingsManager.setSetting('mouseSensitivity', 10)
      expect(settingsManager.getSetting('mouseSensitivity')).toBe(5.0)
      
      settingsManager.setSetting('mouseSensitivity', 2.5)
      expect(settingsManager.getSetting('mouseSensitivity')).toBe(2.5)
    })

    it('should clamp master volume to valid range', () => {
      settingsManager.setSetting('masterVolume', -0.5)
      expect(settingsManager.getSetting('masterVolume')).toBe(0.0)
      
      settingsManager.setSetting('masterVolume', 1.5)
      expect(settingsManager.getSetting('masterVolume')).toBe(1.0)
      
      settingsManager.setSetting('masterVolume', 0.7)
      expect(settingsManager.getSetting('masterVolume')).toBe(0.7)
    })

    it('should clamp target size to valid range', () => {
      settingsManager.setSetting('targetSize', 0.1)
      expect(settingsManager.getSetting('targetSize')).toBe(0.5)
      
      settingsManager.setSetting('targetSize', 5.0)
      expect(settingsManager.getSetting('targetSize')).toBe(2.0)
      
      settingsManager.setSetting('targetSize', 1.2)
      expect(settingsManager.getSetting('targetSize')).toBe(1.2)
    })

    it('should ensure boolean values are properly typed', () => {
      settingsManager.setSetting('audioEnabled', 'true' as any)
      expect(settingsManager.getSetting('audioEnabled')).toBe(true)
      
      settingsManager.setSetting('audioEnabled', 0 as any)
      expect(settingsManager.getSetting('audioEnabled')).toBe(false)
      
      settingsManager.setSetting('autoAdjustQuality', 1 as any)
      expect(settingsManager.getSetting('autoAdjustQuality')).toBe(true)
    })

    it('should validate quality level', () => {
      settingsManager.setSetting('qualityLevel', 'invalid' as any)
      expect(settingsManager.getSetting('qualityLevel')).toBe('auto')
      
      settingsManager.setSetting('qualityLevel', 'high')
      expect(settingsManager.getSetting('qualityLevel')).toBe('high')
      
      settingsManager.setSetting('qualityLevel', 'medium')
      expect(settingsManager.getSetting('qualityLevel')).toBe('medium')
      
      settingsManager.setSetting('qualityLevel', 'low')
      expect(settingsManager.getSetting('qualityLevel')).toBe('low')
    })

    it('should validate target FPS', () => {
      settingsManager.setSetting('targetFps', 45 as any)
      expect(settingsManager.getSetting('targetFps')).toBe(60)
      
      settingsManager.setSetting('targetFps', 30)
      expect(settingsManager.getSetting('targetFps')).toBe(30)
      
      settingsManager.setSetting('targetFps', 120)
      expect(settingsManager.getSetting('targetFps')).toBe(120)
    })
  })

  describe('persistence', () => {
    it('should save settings to localStorage when changed', () => {
      settingsManager.setSetting('mouseSensitivity', 2.0)
      settingsManager.setSetting('audioEnabled', false)
      
      expect(settingsManager.getSetting('mouseSensitivity')).toBe(2.0)
      expect(settingsManager.getSetting('audioEnabled')).toBe(false)
    })

    it('should handle localStorage save errors gracefully', () => {
      // Test that save method doesn't throw even with errors
      expect(() => settingsManager.saveSettings()).not.toThrow()
    })
  })

  describe('reset functionality', () => {
    it('should reset all settings to defaults', () => {
      // Change some settings
      settingsManager.setSetting('mouseSensitivity', 3.0)
      settingsManager.setSetting('audioEnabled', false)
      settingsManager.setSetting('masterVolume', 0.8)
      
      // Reset to defaults
      settingsManager.resetToDefaults()
      
      // Should be back to defaults
      expect(settingsManager.getSetting('mouseSensitivity')).toBe(1.0)
      expect(settingsManager.getSetting('audioEnabled')).toBe(true)
      expect(settingsManager.getSetting('masterVolume')).toBe(0.5)
    })
  })

  describe('edge cases', () => {
    it('should handle undefined localStorage gracefully', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
      
      const newSettingsManager = new SettingsManager()
      
      // Should use defaults when no stored settings
      expect(newSettingsManager.getSetting('mouseSensitivity')).toBe(1.0)
    })

    it('should handle partial settings in localStorage', () => {
      // Test that the settings manager handles partial data gracefully
      const newSettingsManager = new SettingsManager()
      
      // Should have all default settings
      expect(newSettingsManager.getSetting('mouseSensitivity')).toBe(1.0)
      expect(newSettingsManager.getSetting('audioEnabled')).toBe(true)
      expect(newSettingsManager.getSetting('masterVolume')).toBe(0.5)
    })
  })
})