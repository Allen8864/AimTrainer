import { SettingsManager } from './SettingsManager';

export interface MousePosition {
  x: number;
  y: number;
  normalizedX: number; // -1 to 1
  normalizedY: number; // -1 to 1
}

export interface MouseMovement {
  movementX: number;
  movementY: number;
  sensitivity: number;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private settingsManager: SettingsManager;
  private mousePosition: MousePosition;
  private isMouseDown: boolean = false;
  private clickHandlers: Array<(position: MousePosition) => void> = [];
  private mouseMoveHandlers: Array<(position: MousePosition) => void> = [];
  private cameraControlHandlers: Array<(movement: MouseMovement) => void> = [];
  private isPointerLocked: boolean = false;

  constructor(canvas: HTMLCanvasElement, settingsManager: SettingsManager) {
    this.canvas = canvas;
    this.settingsManager = settingsManager;
    this.mousePosition = { x: 0, y: 0, normalizedX: 0, normalizedY: 0 };
    
    this.bindEvents();
  }

  private bindEvents(): void {
    // Mouse events only - desktop focused aim trainer
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));

    // Pointer lock events
    document.addEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
    document.addEventListener('pointerlockerror', this.handlePointerLockError.bind(this));

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.isPointerLocked) {
      // In pointer lock mode, use movement values directly
      this.notifyCameraControlHandlers(event.movementX, event.movementY);
      
      // Update virtual mouse position for UI elements (keep centered)
      const rect = this.canvas.getBoundingClientRect();
      this.mousePosition.x = rect.width / 2;
      this.mousePosition.y = rect.height / 2;
      this.mousePosition.normalizedX = 0;
      this.mousePosition.normalizedY = 0;
    } else {
      // Normal mouse mode
      this.updateMousePosition(event.clientX, event.clientY, event.movementX, event.movementY);
      this.notifyMouseMoveHandlers();
      
      // Notify camera control handlers for first-person view
      if (event.movementX !== 0 || event.movementY !== 0) {
        this.notifyCameraControlHandlers(event.movementX, event.movementY);
      }
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    this.isMouseDown = true;
    event.preventDefault();
  }

  private handleMouseUp(event: MouseEvent): void {
    this.isMouseDown = false;
    event.preventDefault();
  }

  private handleClick(event: MouseEvent): void {
    this.updateMousePosition(event.clientX, event.clientY);
    this.notifyClickHandlers();
    event.preventDefault();
  }





  private updateMousePosition(clientX: number, clientY: number, movementX: number = 0, movementY: number = 0): void {
    const rect = this.canvas.getBoundingClientRect();
    const sensitivity = this.settingsManager.getSetting('mouseSensitivity');
    
    // Calculate raw position relative to canvas
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    
    // Apply sensitivity to movement (for pointer lock or relative movement)
    const sensitizedMovementX = movementX * sensitivity;
    const sensitizedMovementY = movementY * sensitivity;
    
    // Update position with sensitivity applied
    this.mousePosition.x = rawX + sensitizedMovementX;
    this.mousePosition.y = rawY + sensitizedMovementY;
    
    // Clamp to canvas bounds
    this.mousePosition.x = Math.max(0, Math.min(rect.width, this.mousePosition.x));
    this.mousePosition.y = Math.max(0, Math.min(rect.height, this.mousePosition.y));
    
    // Calculate normalized coordinates (-1 to 1)
    this.mousePosition.normalizedX = (this.mousePosition.x / rect.width) * 2 - 1;
    this.mousePosition.normalizedY = -((this.mousePosition.y / rect.height) * 2 - 1); // Flip Y for 3D coordinates
  }

  private notifyClickHandlers(): void {
    this.clickHandlers.forEach(handler => handler(this.mousePosition));
  }

  private notifyMouseMoveHandlers(): void {
    this.mouseMoveHandlers.forEach(handler => handler(this.mousePosition));
  }

  private notifyCameraControlHandlers(movementX: number, movementY: number): void {
    const sensitivity = this.settingsManager.getSetting('mouseSensitivity');
    const movement: MouseMovement = {
      movementX,
      movementY,
      sensitivity
    };
    this.cameraControlHandlers.forEach(handler => handler(movement));
  }

  private handlePointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.canvas;
    console.log('Pointer lock:', this.isPointerLocked ? 'enabled' : 'disabled');
  }

  private handlePointerLockError(): void {
    console.error('Pointer lock failed');
    this.isPointerLocked = false;
  }

  public requestPointerLock(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.canvas.requestPointerLock) {
        this.canvas.requestPointerLock();
        
        // Wait for pointer lock to be acquired
        const checkLock = () => {
          if (document.pointerLockElement === this.canvas) {
            resolve();
          } else {
            setTimeout(checkLock, 10);
          }
        };
        
        setTimeout(() => {
          if (!this.isPointerLocked) {
            reject(new Error('Pointer lock timeout'));
          }
        }, 1000);
        
        checkLock();
      } else {
        reject(new Error('Pointer lock not supported'));
      }
    });
  }

  public exitPointerLock(): void {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  public isPointerLockActive(): boolean {
    return this.isPointerLocked;
  }

  // Public API methods
  getMousePosition(): MousePosition {
    return { ...this.mousePosition };
  }

  isClicking(): boolean {
    return this.isMouseDown;
  }

  getSensitivity(): number {
    return this.settingsManager.getSetting('mouseSensitivity');
  }

  setSensitivity(value: number): void {
    this.settingsManager.setSetting('mouseSensitivity', value);
  }

  onMouseClick(handler: (position: MousePosition) => void): void {
    this.clickHandlers.push(handler);
  }

  onMouseMove(handler: (position: MousePosition) => void): void {
    this.mouseMoveHandlers.push(handler);
  }

  onCameraControl(handler: (movement: MouseMovement) => void): void {
    this.cameraControlHandlers.push(handler);
  }

  removeClickHandler(handler: (position: MousePosition) => void): void {
    const index = this.clickHandlers.indexOf(handler);
    if (index > -1) {
      this.clickHandlers.splice(index, 1);
    }
  }

  removeMouseMoveHandler(handler: (position: MousePosition) => void): void {
    const index = this.mouseMoveHandlers.indexOf(handler);
    if (index > -1) {
      this.mouseMoveHandlers.splice(index, 1);
    }
  }

  removeCameraControlHandler(handler: (movement: MouseMovement) => void): void {
    const index = this.cameraControlHandlers.indexOf(handler);
    if (index > -1) {
      this.cameraControlHandlers.splice(index, 1);
    }
  }

  dispose(): void {
    // Exit pointer lock if active
    this.exitPointerLock();
    
    // Remove all event listeners
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
    
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
    document.removeEventListener('pointerlockerror', this.handlePointerLockError.bind(this));
    
    // Clear handlers
    this.clickHandlers = [];
    this.mouseMoveHandlers = [];
    this.cameraControlHandlers = [];
  }
}