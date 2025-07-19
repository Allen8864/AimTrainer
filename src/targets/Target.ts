import * as THREE from 'three';
import type { TargetData } from '../types/GameTypes';

export class Target {
  private mesh!: THREE.Mesh;
  private data: TargetData;
  private hitEffect: THREE.Mesh | null = null;
  private originalMaterial!: THREE.Material;
  private hitMaterial!: THREE.Material;
  private missEffect: THREE.Mesh | null = null;
  private isPooled: boolean = false;

  constructor(position: THREE.Vector3, size: number = 1) {
    this.data = {
      id: this.generateId(),
      position: { x: position.x, y: position.y, z: position.z },
      size,
      spawnTime: Date.now(),
      isActive: true,
      hitTime: null
    };

    this.createMesh();
    this.createMaterials();
  }

  private generateId(): string {
    return `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createMesh(): void {
    // Create target geometry - a sphere for now, can be enhanced later
    const geometry = new THREE.SphereGeometry(this.data.size, 16, 16);
    
    // Create material with orange color for visibility
    this.originalMaterial = new THREE.MeshLambertMaterial({
      color: 0xff6600,
      transparent: false
    });

    this.mesh = new THREE.Mesh(geometry, this.originalMaterial);
    this.mesh.position.set(this.data.position.x, this.data.position.y, this.data.position.z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Store reference to this target instance in the mesh for hit detection
    this.mesh.userData = { target: this };
  }

  private createMaterials(): void {
    // Hit material - green color
    this.hitMaterial = new THREE.MeshLambertMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8
    });
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public getData(): TargetData {
    return { ...this.data };
  }

  public getId(): string {
    return this.data.id;
  }

  public getPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.data.position.x, this.data.position.y, this.data.position.z);
  }

  public isActive(): boolean {
    return this.data.isActive;
  }

  public onHit(): void {
    if (!this.data.isActive) return;

    this.data.isActive = false;
    this.data.hitTime = Date.now();

    // Visual feedback for hit
    this.showHitEffect();
  }

  public onMiss(hitPoint: THREE.Vector3): void {
    // Show miss effect near the target
    this.showMissEffect(hitPoint);
  }

  private showHitEffect(): void {
    // Change material to hit color
    this.mesh.material = this.hitMaterial;

    // Create expanding ring effect
    const ringGeometry = new THREE.RingGeometry(this.data.size, this.data.size * 1.5, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    this.hitEffect = new THREE.Mesh(ringGeometry, ringMaterial);
    this.hitEffect.position.copy(this.mesh.position);
    this.hitEffect.lookAt(0, 0, 0); // Face the camera

    // Animate the hit effect
    this.animateHitEffect();
  }

  private showMissEffect(hitPoint: THREE.Vector3): void {
    // Create small red sphere at miss location
    const missGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const missMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });

    this.missEffect = new THREE.Mesh(missGeometry, missMaterial);
    this.missEffect.position.copy(hitPoint);

    // Animate miss effect
    this.animateMissEffect();
  }

  private animateHitEffect(): void {
    if (!this.hitEffect) return;

    const startTime = Date.now();
    const duration = 500; // 500ms animation

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (this.hitEffect) {
        // Fade out and scale up
        const material = this.hitEffect.material as THREE.MeshBasicMaterial;
        material.opacity = 0.6 * (1 - progress);
        this.hitEffect.scale.setScalar(1 + progress * 0.5);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Remove hit effect
          if (this.hitEffect && this.hitEffect.parent) {
            this.hitEffect.parent.remove(this.hitEffect);
          }
          this.hitEffect = null;
        }
      }
    };

    animate();
  }

  private animateMissEffect(): void {
    if (!this.missEffect) return;

    const startTime = Date.now();
    const duration = 300; // 300ms animation

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (this.missEffect) {
        // Fade out
        const material = this.missEffect.material as THREE.MeshBasicMaterial;
        material.opacity = 0.8 * (1 - progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Remove miss effect
          if (this.missEffect && this.missEffect.parent) {
            this.missEffect.parent.remove(this.missEffect);
          }
          this.missEffect = null;
        }
      }
    };

    animate();
  }

  public update(_deltaTime: number): void {
    // Future: Add target movement, lifetime management, etc.
    // For now, targets are static
  }

  public destroy(): void {
    this.data.isActive = false;
    
    // Clean up effects
    if (this.hitEffect && this.hitEffect.parent) {
      this.hitEffect.parent.remove(this.hitEffect);
    }
    if (this.missEffect && this.missEffect.parent) {
      this.missEffect.parent.remove(this.missEffect);
    }

    // Dispose of geometries and materials
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    if (this.originalMaterial) {
      this.originalMaterial.dispose();
    }
    if (this.hitMaterial) {
      this.hitMaterial.dispose();
    }
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
    
    // Add effects to scene if they exist
    if (this.hitEffect) {
      scene.add(this.hitEffect);
    }
    if (this.missEffect) {
      scene.add(this.missEffect);
    }
  }

  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    
    if (this.hitEffect) {
      scene.remove(this.hitEffect);
    }
    if (this.missEffect) {
      scene.remove(this.missEffect);
    }
  }

  // Object pooling methods
  public setPooled(pooled: boolean): void {
    this.isPooled = pooled;
  }

  public getPooled(): boolean {
    return this.isPooled;
  }

  public reset(position: THREE.Vector3, size: number): void {
    // Reset target data
    this.data = {
      id: this.generateId(),
      position: { x: position.x, y: position.y, z: position.z },
      size,
      spawnTime: Date.now(),
      isActive: true,
      hitTime: null
    };

    // Update mesh properties
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.material = this.originalMaterial;
    this.mesh.scale.setScalar(size / 0.5); // Adjust scale based on size difference
    this.mesh.visible = true;

    // Clean up any existing effects
    this.cleanupEffects();
  }

  public deactivate(): void {
    this.data.isActive = false;
    this.mesh.visible = false;
    this.cleanupEffects();
  }

  private cleanupEffects(): void {
    if (this.hitEffect) {
      if (this.hitEffect.parent) {
        this.hitEffect.parent.remove(this.hitEffect);
      }
      this.hitEffect = null;
    }
    if (this.missEffect) {
      if (this.missEffect.parent) {
        this.missEffect.parent.remove(this.missEffect);
      }
      this.missEffect = null;
    }
  }

  public dispose(): void {
    this.data.isActive = false;
    
    // Clean up effects
    this.cleanupEffects();

    // Dispose of geometries and materials only if not pooled
    if (!this.isPooled) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.originalMaterial) {
        this.originalMaterial.dispose();
      }
      if (this.hitMaterial) {
        this.hitMaterial.dispose();
      }
    }
  }
}