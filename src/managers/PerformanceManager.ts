import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  averageFps: number;
}

export interface QualitySettings {
  pixelRatio: number;
  shadowMapSize: number;
  antialias: boolean;
  shadowsEnabled: boolean;
  particleCount: number;
  targetComplexity: number;
}

export const QualityLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  AUTO: 'auto'
} as const;

export type QualityLevel = typeof QualityLevel[keyof typeof QualityLevel];

export class PerformanceManager {
  private frameCount: number = 0;
  private lastTime: number = 0;
  private frameTimeHistory: number[] = [];
  private fpsHistory: number[] = [];
  private currentFps: number = 60;
  private targetFps: number = 60;
  private minFps: number = 30;
  private qualityLevel: QualityLevel = QualityLevel.AUTO;
  private qualitySettings: QualitySettings;
  private autoAdjustEnabled: boolean = true;
  private performanceCheckInterval: number = 1000; // Check every second
  private lastPerformanceCheck: number = 0;
  private renderer: THREE.WebGLRenderer | null = null;
  private isMonitoring: boolean = false;
  private onQualityChange?: (settings: QualitySettings) => void;

  constructor() {
    this.qualitySettings = this.getQualitySettings(QualityLevel.HIGH);
    this.detectDeviceCapabilities();
  }

  public initialize(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.startMonitoring();
  }

  private detectDeviceCapabilities(): void {
    // Detect device type and capabilities
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEndDevice = this.isLowEndDevice();
    
    if (isMobile || isLowEndDevice) {
      this.qualityLevel = QualityLevel.MEDIUM;
      this.targetFps = 30;
      this.minFps = 20;
    } else {
      this.qualityLevel = QualityLevel.HIGH;
      this.targetFps = 60;
      this.minFps = 30;
    }

    this.qualitySettings = this.getQualitySettings(this.qualityLevel);
  }

  private isLowEndDevice(): boolean {
    // Simple heuristic to detect low-end devices
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return true;

    const webglContext = gl as WebGLRenderingContext;
    const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      // Check for known low-end GPUs
      const lowEndGPUs = ['PowerVR', 'Adreno 3', 'Mali-4', 'Intel HD Graphics 3000'];
      return lowEndGPUs.some(gpu => renderer.includes(gpu));
    }

    // Fallback: check memory
    const memory = (performance as any).memory;
    if (memory && memory.jsHeapSizeLimit < 1000000000) { // Less than 1GB
      return true;
    }

    return false;
  }

  public startMonitoring(): void {
    this.isMonitoring = true;
    this.lastTime = performance.now();
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
  }

  public update(currentTime: number): void {
    if (!this.isMonitoring) return;

    // Calculate frame time and FPS
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      this.currentFps = fps;
      
      // Update history
      this.frameTimeHistory.push(deltaTime);
      this.fpsHistory.push(fps);
      
      // Keep history size manageable
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
        this.fpsHistory.shift();
      }

      // Check if we need to adjust quality
      if (this.autoAdjustEnabled && 
          currentTime - this.lastPerformanceCheck > this.performanceCheckInterval) {
        this.checkPerformanceAndAdjust();
        this.lastPerformanceCheck = currentTime;
      }
    }

    this.frameCount++;
  }

  private checkPerformanceAndAdjust(): void {
    if (this.fpsHistory.length < 30) return; // Need enough data

    const averageFps = this.getAverageFps();
    const isPerformancePoor = averageFps < this.minFps;
    const isPerformanceGood = averageFps > this.targetFps * 0.9;

    if (isPerformancePoor && this.qualityLevel !== QualityLevel.LOW) {
      this.downgradeQuality();
    } else if (isPerformanceGood && this.qualityLevel !== QualityLevel.HIGH) {
      this.upgradeQuality();
    }
  }

  private downgradeQuality(): void {
    let newLevel: QualityLevel;
    
    switch (this.qualityLevel) {
      case QualityLevel.HIGH:
        newLevel = QualityLevel.MEDIUM;
        break;
      case QualityLevel.MEDIUM:
        newLevel = QualityLevel.LOW;
        break;
      default:
        return; // Already at lowest
    }

    this.setQualityLevel(newLevel);
    console.log(`Performance: Downgraded quality to ${newLevel} (FPS: ${this.getAverageFps().toFixed(1)})`);
  }

  private upgradeQuality(): void {
    let newLevel: QualityLevel;
    
    switch (this.qualityLevel) {
      case QualityLevel.LOW:
        newLevel = QualityLevel.MEDIUM;
        break;
      case QualityLevel.MEDIUM:
        newLevel = QualityLevel.HIGH;
        break;
      default:
        return; // Already at highest
    }

    this.setQualityLevel(newLevel);
    console.log(`Performance: Upgraded quality to ${newLevel} (FPS: ${this.getAverageFps().toFixed(1)})`);
  }

  public setQualityLevel(level: QualityLevel): void {
    this.qualityLevel = level;
    this.qualitySettings = this.getQualitySettings(level);
    
    // Apply settings to renderer if available
    if (this.renderer) {
      this.applyQualitySettings();
    }

    // Notify listeners
    if (this.onQualityChange) {
      this.onQualityChange(this.qualitySettings);
    }
  }

  private getQualitySettings(level: QualityLevel): QualitySettings {
    switch (level) {
      case QualityLevel.LOW:
        return {
          pixelRatio: 1,
          shadowMapSize: 512,
          antialias: false,
          shadowsEnabled: false,
          particleCount: 10,
          targetComplexity: 8
        };
      
      case QualityLevel.MEDIUM:
        return {
          pixelRatio: Math.min(window.devicePixelRatio, 1.5),
          shadowMapSize: 1024,
          antialias: true,
          shadowsEnabled: true,
          particleCount: 25,
          targetComplexity: 16
        };
      
      case QualityLevel.HIGH:
      default:
        return {
          pixelRatio: Math.min(window.devicePixelRatio, 2),
          shadowMapSize: 2048,
          antialias: true,
          shadowsEnabled: true,
          particleCount: 50,
          targetComplexity: 32
        };
    }
  }

  private applyQualitySettings(): void {
    if (!this.renderer) return;

    // Apply pixel ratio
    this.renderer.setPixelRatio(this.qualitySettings.pixelRatio);
    
    // Apply shadow settings
    this.renderer.shadowMap.enabled = this.qualitySettings.shadowsEnabled;
    
    // Update shadow map size for all lights
    this.updateShadowMapSizes();
  }

  private updateShadowMapSizes(): void {
    // This would be called by the renderer to update shadow map sizes
    // Implementation depends on how lights are managed
  }

  public getMetrics(): PerformanceMetrics {
    const memoryInfo = (performance as any).memory;
    
    return {
      fps: this.currentFps,
      frameTime: this.frameTimeHistory.length > 0 ? 
        this.frameTimeHistory[this.frameTimeHistory.length - 1] : 0,
      memoryUsage: memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0, // MB
      renderTime: 0, // Would need to be measured separately
      averageFps: this.getAverageFps()
    };
  }

  public getAverageFps(): number {
    if (this.fpsHistory.length === 0) return 60;
    
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  public getCurrentQuality(): QualityLevel {
    return this.qualityLevel;
  }

  public getCurrentQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }

  public setAutoAdjust(enabled: boolean): void {
    this.autoAdjustEnabled = enabled;
  }

  public isAutoAdjustEnabled(): boolean {
    return this.autoAdjustEnabled;
  }

  public setTargetFps(fps: number): void {
    this.targetFps = Math.max(15, Math.min(120, fps));
  }

  public getTargetFps(): number {
    return this.targetFps;
  }

  public setMinFps(fps: number): void {
    this.minFps = Math.max(10, Math.min(60, fps));
  }

  public getMinFps(): number {
    return this.minFps;
  }

  public onQualityChanged(callback: (settings: QualitySettings) => void): void {
    this.onQualityChange = callback;
  }

  public reset(): void {
    this.frameCount = 0;
    this.frameTimeHistory = [];
    this.fpsHistory = [];
    this.lastTime = performance.now();
    this.lastPerformanceCheck = 0;
  }

  public dispose(): void {
    this.stopMonitoring();
    this.renderer = null;
    this.onQualityChange = undefined;
  }
}