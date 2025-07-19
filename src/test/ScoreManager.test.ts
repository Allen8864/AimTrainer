import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ScoreManager } from '../managers/ScoreManager'

describe('ScoreManager', () => {
  let scoreManager: ScoreManager

  beforeEach(() => {
    vi.clearAllMocks()
    scoreManager = new ScoreManager()
  })

  describe('initialization', () => {
    it('should initialize with zero values', () => {
      expect(scoreManager.getScore()).toBe(0)
      expect(scoreManager.getAccuracy()).toBe(0)
      expect(scoreManager.getHits()).toBe(0)
      expect(scoreManager.getMisses()).toBe(0)
      expect(scoreManager.getCurrentStreak()).toBe(0)
      expect(scoreManager.getBestStreak()).toBe(0)
    })
  })

  describe('hit tracking', () => {
    it('should add hit and increase score', () => {
      const score = scoreManager.addHit()
      
      expect(scoreManager.getHits()).toBe(1)
      expect(scoreManager.getScore()).toBe(score)
      expect(scoreManager.getCurrentStreak()).toBe(1)
      expect(scoreManager.getBestStreak()).toBe(1)
    })

    it('should calculate time bonus for fast reactions', () => {
      const fastReactionTime = 500 // 0.5 seconds
      const score = scoreManager.addHit(fastReactionTime)
      
      expect(score).toBeGreaterThan(100) // Base score + time bonus
    })

    it('should not give time bonus for slow reactions', () => {
      const slowReactionTime = 1500 // 1.5 seconds
      const score = scoreManager.addHit(slowReactionTime)
      
      expect(score).toBe(110) // Base score (100) + streak bonus (10)
    })

    it('should add streak bonus', () => {
      scoreManager.addHit() // First hit: 100 + 10 = 110
      const secondScore = scoreManager.addHit() // Second hit: 100 + 20 = 120
      
      expect(scoreManager.getCurrentStreak()).toBe(2)
      expect(secondScore).toBe(120)
    })

    it('should update best streak', () => {
      // Create a streak of 5
      for (let i = 0; i < 5; i++) {
        scoreManager.addHit()
      }
      
      expect(scoreManager.getBestStreak()).toBe(5)
      
      // Miss to reset streak
      scoreManager.addMiss()
      expect(scoreManager.getCurrentStreak()).toBe(0)
      expect(scoreManager.getBestStreak()).toBe(5) // Best streak should remain
      
      // Create a smaller streak
      scoreManager.addHit()
      scoreManager.addHit()
      
      expect(scoreManager.getCurrentStreak()).toBe(2)
      expect(scoreManager.getBestStreak()).toBe(5) // Best streak should still be 5
    })
  })

  describe('miss tracking', () => {
    it('should add miss and reset streak', () => {
      scoreManager.addHit()
      scoreManager.addHit()
      expect(scoreManager.getCurrentStreak()).toBe(2)
      
      scoreManager.addMiss()
      
      expect(scoreManager.getMisses()).toBe(1)
      expect(scoreManager.getCurrentStreak()).toBe(0)
    })
  })

  describe('accuracy calculation', () => {
    it('should calculate accuracy correctly', () => {
      scoreManager.addHit()
      scoreManager.addHit()
      scoreManager.addMiss()
      
      // 2 hits out of 3 shots = 66.67%
      expect(scoreManager.getAccuracy()).toBeCloseTo(66.67, 1)
    })

    it('should handle zero shots', () => {
      expect(scoreManager.getAccuracy()).toBe(0)
    })

    it('should handle perfect accuracy', () => {
      scoreManager.addHit()
      scoreManager.addHit()
      scoreManager.addHit()
      
      expect(scoreManager.getAccuracy()).toBe(100)
    })

    it('should handle zero accuracy', () => {
      scoreManager.addMiss()
      scoreManager.addMiss()
      
      expect(scoreManager.getAccuracy()).toBe(0)
    })
  })

  describe('statistics', () => {
    it('should return complete statistics', () => {
      scoreManager.addHit()
      scoreManager.addMiss()
      
      const stats = scoreManager.getStatistics()
      
      expect(stats).toHaveProperty('totalScore')
      expect(stats).toHaveProperty('hits')
      expect(stats).toHaveProperty('misses')
      expect(stats).toHaveProperty('accuracy')
      expect(stats).toHaveProperty('sessionTime')
      expect(stats).toHaveProperty('bestStreak')
      expect(stats).toHaveProperty('currentStreak')
      
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.accuracy).toBe(50)
    })
  })

  describe('reset functionality', () => {
    it('should reset all values to zero', () => {
      scoreManager.addHit()
      scoreManager.addHit()
      scoreManager.addMiss()
      
      scoreManager.reset()
      
      expect(scoreManager.getScore()).toBe(0)
      expect(scoreManager.getAccuracy()).toBe(0)
      expect(scoreManager.getHits()).toBe(0)
      expect(scoreManager.getMisses()).toBe(0)
      expect(scoreManager.getCurrentStreak()).toBe(0)
      expect(scoreManager.getBestStreak()).toBe(0)
    })
  })

  describe('end game statistics', () => {
    it('should format end game statistics correctly', () => {
      scoreManager.addHit()
      scoreManager.addHit()
      scoreManager.addMiss()
      
      const statsString = scoreManager.showEndGameStatistics()
      
      expect(statsString).toContain('Final Score:')
      expect(statsString).toContain('Targets Hit: 2')
      expect(statsString).toContain('Total Shots: 3')
      expect(statsString).toContain('Accuracy: 66.7%')
      expect(statsString).toContain('Best Streak: 2')
      expect(statsString).toContain('Session Time:')
    })
  })
})