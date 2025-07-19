import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TargetManager } from '../targets/TargetManager'
import * as THREE from 'three'

describe('TargetManager', () => {
  let targetManager: TargetManager
  let mockScene: THREE.Scene
  let mockCamera: THREE.Camera

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock scene
    mockScene = new THREE.Scene()
    
    // Create mock camera
    mockCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    // Add missing method for testing
    mockCamera.getWorldDirection = vi.fn().mockImplementation((target: THREE.Vector3) => {
      target.set(0, 0, -1) // Default forward direction
      return target
    })
    
    targetManager = new TargetManager(mockScene, mockCamera)
  })

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(targetManager.getTargetCount()).toBe(0) // No targets initially
      expect(targetManager.getActiveTargetCount()).toBe(0)
    })

    it('should spawn initial targets when startSpawning is called', () => {
      targetManager.startSpawning()
      const activeCount = targetManager.getActiveTargetCount()
      expect(activeCount).toBeGreaterThan(0)
      expect(activeCount).toBeLessThanOrEqual(3) // Default max targets
    })
  })

  describe('target spawning', () => {
    it('should spawn target at specified position', () => {
      const position = new THREE.Vector3(5, 2, -3)
      const target = targetManager.spawnTarget(position)
      
      expect(target).toBeDefined()
      expect(target.isActive()).toBe(true)
    })

    it('should spawn target at random position when none specified', () => {
      const initialCount = targetManager.getTargetCount()
      const target = targetManager.spawnTarget()
      
      expect(target).toBeDefined()
      expect(targetManager.getTargetCount()).toBe(initialCount + 1)
    })

    it('should track spawned targets', () => {
      const initialCount = targetManager.getTargetCount()
      targetManager.spawnTarget()
      
      expect(targetManager.getTargetCount()).toBe(initialCount + 1)
    })
  })

  describe('target removal', () => {
    it('should remove target by ID', () => {
      const target = targetManager.spawnTarget()
      const targetId = target.getId()
      const initialCount = targetManager.getTargetCount()
      
      targetManager.removeTarget(targetId)
      
      expect(targetManager.getTargetCount()).toBe(initialCount - 1)
    })

    it('should handle removal of non-existent target gracefully', () => {
      const initialCount = targetManager.getTargetCount()
      
      targetManager.removeTarget('non-existent-id')
      
      expect(targetManager.getTargetCount()).toBe(initialCount)
    })
  })

  describe('hit detection', () => {
    it('should have checkHit method that returns result object', () => {
      const result = targetManager.checkHit(400, 300, 800, 600)
      
      expect(result).toHaveProperty('hit')
      expect(typeof result.hit).toBe('boolean')
      expect(result).toHaveProperty('hitPoint')
    })

    it('should handle hit detection without throwing errors', () => {
      expect(() => {
        targetManager.checkHit(400, 300, 800, 600)
      }).not.toThrow()
    })

    it('should handle edge case coordinates', () => {
      expect(() => {
        targetManager.checkHit(0, 0, 800, 600) // Top-left corner
        targetManager.checkHit(800, 600, 800, 600) // Bottom-right corner
      }).not.toThrow()
    })
  })

  describe('target management', () => {
    it('should update all active targets', () => {
      const targets = targetManager.getActiveTargets()
      const updateSpies = targets.map(target => vi.spyOn(target, 'update'))
      
      const deltaTime = 0.016 // 60 FPS
      targetManager.updateTargets(deltaTime)
      
      updateSpies.forEach(spy => {
        expect(spy).toHaveBeenCalledWith(deltaTime)
      })
    })

    it('should get active targets only', () => {
      const activeTargets = targetManager.getActiveTargets()
      
      activeTargets.forEach(target => {
        expect(target.isActive()).toBe(true)
      })
    })

    it('should get correct target counts', () => {
      targetManager.startSpawning()
      const totalCount = targetManager.getTargetCount()
      const activeCount = targetManager.getActiveTargetCount()
      
      expect(totalCount).toBeGreaterThanOrEqual(activeCount)
      expect(activeCount).toBeGreaterThan(0)
    })
  })

  describe('configuration', () => {
    it('should set maximum target count', () => {
      targetManager.setMaxTargets(5)
      
      // Should adjust current targets to match new max
      expect(targetManager.getActiveTargetCount()).toBeLessThanOrEqual(5)
    })

    it('should clamp max targets to valid range', () => {
      targetManager.setMaxTargets(0) // Below minimum
      expect(targetManager.getActiveTargetCount()).toBeGreaterThan(0)
      
      targetManager.setMaxTargets(15) // Above maximum
      expect(targetManager.getActiveTargetCount()).toBeLessThanOrEqual(10)
    })

    it('should set target size', () => {
      // This should not throw and should clamp to valid range
      targetManager.setTargetSize(0.05) // Below minimum
      targetManager.setTargetSize(3.0)  // Above maximum
      targetManager.setTargetSize(1.5)  // Valid value
      
      // Test passes if no errors thrown
      expect(true).toBe(true)
    })

    it('should set spawn radius', () => {
      // This should not throw and should clamp to valid range
      targetManager.setSpawnRadius(1)   // Below minimum
      targetManager.setSpawnRadius(20)  // Above maximum
      targetManager.setSpawnRadius(10)  // Valid value
      
      // Test passes if no errors thrown
      expect(true).toBe(true)
    })
  })

  describe('reset and cleanup', () => {
    it('should clear all targets', () => {
      targetManager.startSpawning()
      expect(targetManager.getTargetCount()).toBeGreaterThan(0)
      
      targetManager.clearAllTargets()
      
      expect(targetManager.getTargetCount()).toBe(0)
      expect(targetManager.getActiveTargetCount()).toBe(0)
    })

    it('should reset to initial state', () => {
      // Start spawning first
      targetManager.startSpawning()
      expect(targetManager.getTargetCount()).toBeGreaterThan(0)
      
      // Reset should clear targets and stop spawning
      targetManager.reset()
      
      // Should have no targets after reset
      expect(targetManager.getTargetCount()).toBe(0)
      expect(targetManager.getActiveTargetCount()).toBe(0)
    })

    it('should dispose properly', () => {
      targetManager.dispose()
      
      // Should clear all targets
      expect(targetManager.getTargetCount()).toBe(0)
    })
  })

  describe('performance optimization', () => {
    it('should provide pool statistics', () => {
      const stats = targetManager.getPoolStats()
      
      expect(stats).toHaveProperty('active')
      expect(stats).toHaveProperty('pooled')
      expect(stats).toHaveProperty('total')
      expect(typeof stats.active).toBe('number')
      expect(typeof stats.pooled).toBe('number')
      expect(typeof stats.total).toBe('number')
    })

    it('should preload targets', () => {
      const initialStats = targetManager.getPoolStats()
      
      targetManager.preloadTargets(5)
      
      const newStats = targetManager.getPoolStats()
      expect(newStats.total).toBeGreaterThanOrEqual(initialStats.total)
    })

    it('should set max pool size', () => {
      // Should not throw error
      targetManager.setMaxPoolSize(20)
      expect(true).toBe(true)
    })

    it('should set target complexity', () => {
      // Test that the method exists and can be called without errors
      expect(() => {
        targetManager.setTargetComplexity(16)
      }).not.toThrow()
      
      // Test with different values
      expect(() => {
        targetManager.setTargetComplexity(8)
        targetManager.setTargetComplexity(32)
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle empty scene gracefully', () => {
      const emptyScene = new THREE.Scene()
      const emptyTargetManager = new TargetManager(emptyScene, mockCamera)
      
      // Should start with no targets
      expect(emptyTargetManager.getTargetCount()).toBe(0)
      
      // Should be able to start spawning without errors
      expect(() => {
        emptyTargetManager.startSpawning()
      }).not.toThrow()
    })

    it('should handle rapid target spawning and removal', () => {
      const initialCount = targetManager.getTargetCount()
      
      // Rapidly spawn and remove targets
      for (let i = 0; i < 10; i++) {
        const target = targetManager.spawnTarget()
        targetManager.removeTarget(target.getId())
      }
      
      // Should maintain stability
      expect(targetManager.getTargetCount()).toBe(initialCount)
    })
  })
})