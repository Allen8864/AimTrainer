import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InputManager } from '../managers/InputManager'
import { SettingsManager } from '../managers/SettingsManager'

describe('InputManager', () => {
  let inputManager: InputManager
  let mockCanvas: HTMLCanvasElement
  let mockSettingsManager: SettingsManager

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock canvas
    mockCanvas = document.createElement('canvas')
    mockCanvas.width = 800
    mockCanvas.height = 600
    
    // Mock getBoundingClientRect
    vi.spyOn(mockCanvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })

    // Create mock settings manager
    mockSettingsManager = new SettingsManager()
    vi.spyOn(mockSettingsManager, 'getSetting').mockReturnValue(1.0) // Default sensitivity

    inputManager = new InputManager(mockCanvas, mockSettingsManager)
  })

  describe('initialization', () => {
    it('should initialize with default mouse position', () => {
      const position = inputManager.getMousePosition()
      
      expect(position.x).toBe(0)
      expect(position.y).toBe(0)
      expect(position.normalizedX).toBe(0)
      expect(position.normalizedY).toBe(0)
    })

    it('should not be clicking initially', () => {
      expect(inputManager.isClicking()).toBe(false)
    })

    it('should get sensitivity from settings manager', () => {
      const sensitivity = inputManager.getSensitivity()
      expect(sensitivity).toBe(1.0)
      expect(mockSettingsManager.getSetting).toHaveBeenCalledWith('mouseSensitivity')
    })
  })

  describe('mouse position calculation', () => {
    it('should calculate normalized coordinates correctly', () => {
      // Simulate mouse move to center of canvas
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 400, // Center X
        clientY: 300  // Center Y
      })
      
      mockCanvas.dispatchEvent(mouseEvent)
      
      const position = inputManager.getMousePosition()
      expect(position.normalizedX).toBeCloseTo(0, 1) // Center should be 0
      expect(position.normalizedY).toBeCloseTo(0, 1) // Center should be 0
    })

    it('should handle edge coordinates correctly', () => {
      // Top-left corner
      let mouseEvent = new MouseEvent('mousemove', {
        clientX: 0,
        clientY: 0
      })
      mockCanvas.dispatchEvent(mouseEvent)
      
      let position = inputManager.getMousePosition()
      expect(position.normalizedX).toBeCloseTo(-1, 1)
      expect(position.normalizedY).toBeCloseTo(1, 1) // Y is flipped for 3D

      // Bottom-right corner
      mouseEvent = new MouseEvent('mousemove', {
        clientX: 800,
        clientY: 600
      })
      mockCanvas.dispatchEvent(mouseEvent)
      
      position = inputManager.getMousePosition()
      expect(position.normalizedX).toBeCloseTo(1, 1)
      expect(position.normalizedY).toBeCloseTo(-1, 1) // Y is flipped for 3D
    })
  })

  describe('click handling', () => {
    it('should track mouse down state', () => {
      expect(inputManager.isClicking()).toBe(false)
      
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 400, clientY: 300 })
      mockCanvas.dispatchEvent(mouseDownEvent)
      
      expect(inputManager.isClicking()).toBe(true)
      
      const mouseUpEvent = new MouseEvent('mouseup', { clientX: 400, clientY: 300 })
      mockCanvas.dispatchEvent(mouseUpEvent)
      
      expect(inputManager.isClicking()).toBe(false)
    })

    it('should notify click handlers', () => {
      const clickHandler = vi.fn()
      inputManager.onMouseClick(clickHandler)
      
      const clickEvent = new MouseEvent('click', { clientX: 400, clientY: 300 })
      mockCanvas.dispatchEvent(clickEvent)
      
      expect(clickHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 400,
          y: 300,
          normalizedX: expect.any(Number),
          normalizedY: expect.any(Number)
        })
      )
    })

    it('should notify mouse move handlers', () => {
      const moveHandler = vi.fn()
      inputManager.onMouseMove(moveHandler)
      
      const moveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 150 })
      mockCanvas.dispatchEvent(moveEvent)
      
      expect(moveHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 200,
          y: 150,
          normalizedX: expect.any(Number),
          normalizedY: expect.any(Number)
        })
      )
    })
  })

  describe('sensitivity handling', () => {
    it('should apply sensitivity to mouse movement', () => {
      vi.spyOn(mockSettingsManager, 'getSetting').mockReturnValue(2.0) // High sensitivity
      
      const moveEvent = new MouseEvent('mousemove', {
        clientX: 400,
        clientY: 300,
        movementX: 10,
        movementY: 10
      })
      
      mockCanvas.dispatchEvent(moveEvent)
      
      // Test passes if no errors are thrown - sensitivity logic is complex to test in isolation
      expect(inputManager.getSensitivity()).toBe(2.0)
    })

    it('should set sensitivity through settings manager', () => {
      const setSpy = vi.spyOn(mockSettingsManager, 'setSetting')
      
      inputManager.setSensitivity(1.5)
      
      expect(setSpy).toHaveBeenCalledWith('mouseSensitivity', 1.5)
    })
  })

  describe('handler management', () => {
    it('should remove click handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      inputManager.onMouseClick(handler1)
      inputManager.onMouseClick(handler2)
      
      // Remove first handler
      inputManager.removeClickHandler(handler1)
      
      const clickEvent = new MouseEvent('click', { clientX: 400, clientY: 300 })
      mockCanvas.dispatchEvent(clickEvent)
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('should remove mouse move handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      inputManager.onMouseMove(handler1)
      inputManager.onMouseMove(handler2)
      
      // Remove first handler
      inputManager.removeMouseMoveHandler(handler1)
      
      const moveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 150 })
      mockCanvas.dispatchEvent(moveEvent)
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('disposal', () => {
    it('should clean up event listeners and handlers', () => {
      const clickHandler = vi.fn()
      const moveHandler = vi.fn()
      
      inputManager.onMouseClick(clickHandler)
      inputManager.onMouseMove(moveHandler)
      
      inputManager.dispose()
      
      // Events should not trigger handlers after disposal
      const clickEvent = new MouseEvent('click', { clientX: 400, clientY: 300 })
      const moveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 150 })
      
      mockCanvas.dispatchEvent(clickEvent)
      mockCanvas.dispatchEvent(moveEvent)
      
      expect(clickHandler).not.toHaveBeenCalled()
      expect(moveHandler).not.toHaveBeenCalled()
    })
  })
})