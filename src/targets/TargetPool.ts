import * as THREE from 'three';
import { Target } from './Target';

export class TargetPool {
  private pool: Target[] = [];
  private activeTargets: Set<Target> = new Set();
  private maxPoolSize: number = 20;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, initialSize: number = 10) {
    this.scene = scene;
    this.initializePool(initialSize);
  }

  private initializePool(size: number): void {
    for (let i = 0; i < size; i++) {
      const target = new Target(new THREE.Vector3(0, 0, 0), 0.5);
      target.setPooled(true); // Mark as pooled object
      this.pool.push(target);
    }
  }

  public acquire(position: THREE.Vector3, size: number): Target {
    let target: Target;

    if (this.pool.length > 0) {
      // Reuse existing target from pool
      target = this.pool.pop()!;
      target.reset(position, size);
    } else {
      // Create new target if pool is empty
      target = new Target(position, size);
      target.setPooled(true);
    }

    this.activeTargets.add(target);
    target.addToScene(this.scene);
    return target;
  }

  public release(target: Target): void {
    if (!this.activeTargets.has(target)) {
      return; // Target not from this pool
    }

    this.activeTargets.delete(target);
    target.removeFromScene(this.scene);
    target.deactivate();

    // Return to pool if we haven't exceeded max size
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(target);
    } else {
      // Dispose if pool is full
      target.dispose();
    }
  }

  public getActiveCount(): number {
    return this.activeTargets.size;
  }

  public getPoolSize(): number {
    return this.pool.length;
  }

  public getTotalCount(): number {
    return this.activeTargets.size + this.pool.length;
  }

  public setMaxPoolSize(size: number): void {
    this.maxPoolSize = Math.max(5, Math.min(50, size));
    
    // Trim pool if it's too large
    while (this.pool.length > this.maxPoolSize) {
      const target = this.pool.pop();
      if (target) {
        target.dispose();
      }
    }
  }

  public clear(): void {
    // Release all active targets
    const activeArray = Array.from(this.activeTargets);
    activeArray.forEach(target => this.release(target));

    // Dispose all pooled targets
    this.pool.forEach(target => target.dispose());
    this.pool.length = 0;
  }

  public dispose(): void {
    this.clear();
  }

  // Preload pool with targets for better performance
  public preload(count: number): void {
    const targetCount = Math.min(count, this.maxPoolSize);
    const currentTotal = this.getTotalCount();
    
    if (currentTotal < targetCount) {
      const toCreate = targetCount - currentTotal;
      for (let i = 0; i < toCreate; i++) {
        const target = new Target(new THREE.Vector3(0, 0, 0), 0.5);
        target.setPooled(true);
        this.pool.push(target);
      }
    }
  }

  // Get statistics for debugging
  public getStats(): { active: number; pooled: number; total: number } {
    return {
      active: this.activeTargets.size,
      pooled: this.pool.length,
      total: this.getTotalCount()
    };
  }
}