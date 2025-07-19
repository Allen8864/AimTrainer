import * as THREE from 'three';
import { OBJLoader } from 'three-stdlib';

export interface AssetLoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentAsset: string;
}

export class AssetManager {
  private textureCache: Map<string, THREE.Texture> = new Map();
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  private audioCache: Map<string, AudioBuffer> = new Map();
  private loadingManager: THREE.LoadingManager;
  private textureLoader: THREE.TextureLoader;
  private objLoader: OBJLoader;
  private audioContext: AudioContext | null = null;
  private isLoading: boolean = false;
  private onProgress?: (progress: AssetLoadingProgress) => void;
  private onComplete?: () => void;

  constructor(audioContext?: AudioContext) {
    this.audioContext = audioContext || null;
    this.loadingManager = new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.objLoader = new OBJLoader(this.loadingManager);
    
    this.setupLoadingManager();
  }

  private setupLoadingManager(): void {
    this.loadingManager.onProgress = (url, loaded, total) => {
      if (this.onProgress) {
        this.onProgress({
          loaded,
          total,
          percentage: (loaded / total) * 100,
          currentAsset: url
        });
      }
    };

    this.loadingManager.onLoad = () => {
      this.isLoading = false;
      if (this.onComplete) {
        this.onComplete();
      }
    };

    this.loadingManager.onError = () => {
      // Ignore loading errors
    };
  }

  public setProgressCallback(callback: (progress: AssetLoadingProgress) => void): void {
    this.onProgress = callback;
  }

  public setCompleteCallback(callback: () => void): void {
    this.onComplete = callback;
  }

  // Texture management
  public async loadTexture(url: string, key?: string): Promise<THREE.Texture> {
    const cacheKey = key || url;
    
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          // Optimize texture settings
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          
          this.textureCache.set(cacheKey, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  public getTexture(key: string): THREE.Texture | null {
    return this.textureCache.get(key) || null;
  }

  // OBJ model loading
  public async loadOBJModel(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.objLoader.load(
        url,
        (object) => {
          resolve(object);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  // Geometry management
  public cacheGeometry(key: string, geometry: THREE.BufferGeometry): void {
    if (!this.geometryCache.has(key)) {
      this.geometryCache.set(key, geometry);
    }
  }

  public getGeometry(key: string): THREE.BufferGeometry | null {
    return this.geometryCache.get(key) || null;
  }

  public createOptimizedSphereGeometry(radius: number, segments: number): THREE.BufferGeometry {
    const key = `sphere_${radius}_${segments}`;
    
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key)!;
    }

    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    this.geometryCache.set(key, geometry);
    return geometry;
  }

  // Material management
  public cacheMaterial(key: string, material: THREE.Material): void {
    if (!this.materialCache.has(key)) {
      this.materialCache.set(key, material);
    }
  }

  public getMaterial(key: string): THREE.Material | null {
    return this.materialCache.get(key) || null;
  }

  public createOptimizedMaterial(options: {
    color?: number;
    transparent?: boolean;
    opacity?: number;
    type?: 'basic' | 'lambert' | 'phong';
  }): THREE.Material {
    const key = `material_${JSON.stringify(options)}`;
    
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key)!;
    }

    let material: THREE.Material;
    
    switch (options.type || 'lambert') {
      case 'basic':
        material = new THREE.MeshBasicMaterial({
          color: options.color || 0xffffff,
          transparent: options.transparent || false,
          opacity: options.opacity || 1.0
        });
        break;
      case 'phong':
        material = new THREE.MeshPhongMaterial({
          color: options.color || 0xffffff,
          transparent: options.transparent || false,
          opacity: options.opacity || 1.0
        });
        break;
      case 'lambert':
      default:
        material = new THREE.MeshLambertMaterial({
          color: options.color || 0xffffff,
          transparent: options.transparent || false,
          opacity: options.opacity || 1.0
        });
        break;
    }

    this.materialCache.set(key, material);
    return material;
  }

  // Audio management
  public async loadAudio(url: string, key?: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const cacheKey = key || url;
    
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.audioCache.set(cacheKey, audioBuffer);
      return audioBuffer;
    } catch (error) {
      throw error;
    }
  }

  public getAudio(key: string): AudioBuffer | null {
    return this.audioCache.get(key) || null;
  }

  // Preloading
  public async preloadAssets(assets: {
    textures?: { url: string; key: string }[];
    audio?: { url: string; key: string }[];
  }): Promise<void> {
    this.isLoading = true;
    const promises: Promise<any>[] = [];

    // Preload textures
    if (assets.textures) {
      for (const texture of assets.textures) {
        promises.push(this.loadTexture(texture.url, texture.key));
      }
    }

    // Preload audio
    if (assets.audio && this.audioContext) {
      for (const audio of assets.audio) {
        promises.push(this.loadAudio(audio.url, audio.key));
      }
    }

    try {
      await Promise.all(promises);
    } catch (error) {
      // Ignore preload errors
    }
  }

  // Memory management
  public getMemoryUsage(): {
    textures: number;
    geometries: number;
    materials: number;
    audio: number;
    total: number;
  } {
    let textureMemory = 0;
    let geometryMemory = 0;
    let materialMemory = 0;
    let audioMemory = 0;

    // Estimate texture memory usage
    this.textureCache.forEach(texture => {
      if (texture.image) {
        const size = texture.image.width * texture.image.height * 4; // RGBA
        textureMemory += size;
      }
    });

    // Estimate geometry memory usage
    this.geometryCache.forEach(geometry => {
      const attributes = geometry.attributes;
      for (const key in attributes) {
        const attribute = attributes[key];
        geometryMemory += attribute.array.byteLength;
      }
    });

    // Audio memory usage
    this.audioCache.forEach(buffer => {
      audioMemory += buffer.length * buffer.numberOfChannels * 4; // 32-bit float
    });

    // Materials are relatively small, estimate
    materialMemory = this.materialCache.size * 1024; // 1KB per material estimate

    return {
      textures: textureMemory,
      geometries: geometryMemory,
      materials: materialMemory,
      audio: audioMemory,
      total: textureMemory + geometryMemory + materialMemory + audioMemory
    };
  }

  public clearUnusedAssets(): void {
    // This is a simplified cleanup - in a real implementation,
    // you'd track asset usage and only clear truly unused assets
    
    // Force garbage collection of unused Three.js resources
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  public optimizeForLowMemory(): void {
    // Reduce texture quality for low memory situations
    this.textureCache.forEach((texture) => {
      if (texture.image && texture.image.width > 512) {
        // Create lower resolution version
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = Math.max(256, texture.image.width / 2);
          canvas.height = Math.max(256, texture.image.height / 2);
          ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
          texture.image = canvas;
          texture.needsUpdate = true;
        }
      }
    });
  }

  public isLoadingAssets(): boolean {
    return this.isLoading;
  }

  public dispose(): void {
    // Dispose textures
    this.textureCache.forEach(texture => {
      texture.dispose();
    });
    this.textureCache.clear();

    // Dispose geometries
    this.geometryCache.forEach(geometry => {
      geometry.dispose();
    });
    this.geometryCache.clear();

    // Dispose materials
    this.materialCache.forEach(material => {
      material.dispose();
    });
    this.materialCache.clear();

    // Clear audio cache
    this.audioCache.clear();
  }
}