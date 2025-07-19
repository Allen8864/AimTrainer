import * as THREE from 'three';
import { Target } from './Target';
import { TargetPool } from './TargetPool';

export class TargetManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private targets: Map<string, Target> = new Map();
  private targetPool: TargetPool;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private maxTargets: number = 3;
  private targetSize: number = 0.5;
  private isSpawning: boolean = false;
  private spawnInterval: number | null = null;
  
  // Training area bounds
  private TRAINING_AREA = {
    minX: -10,
    maxX: 10,
    minY: 0.5,   // Just above floor
    maxY: 6,     // Below ceiling
    minZ: -20,   // Front area
    maxZ: -8     // Not too close to player
  };

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.targetPool = new TargetPool(scene, 15); // Initialize pool with 15 targets
    // Don't setup initial targets - wait for startSpawning to be called
  }

  private setupInitialTargets(): void {
    // Spawn initial targets
    for (let i = 0; i < this.maxTargets; i++) {
      this.spawnTarget();
    }
  }

  public spawnTarget(position?: THREE.Vector3): Target {
    let targetPosition: THREE.Vector3;
    
    if (position) {
      targetPosition = position;
    } else {
      // 70% chance to spawn in view, 30% chance for random position
      // This provides good training balance
      if (Math.random() < 0.7) {
        targetPosition = this.generatePositionInView();
      } else {
        targetPosition = this.generateRandomPosition();
      }
    }
    
    // Ensure position is within bounds
    targetPosition = this.clampToBounds(targetPosition);
    
    // Get target from pool
    const target = this.targetPool.acquire(targetPosition, this.targetSize);
    
    // Add to tracking
    this.targets.set(target.getId(), target);
    
    return target;
  }

  private clampToBounds(position: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      Math.max(this.TRAINING_AREA.minX, Math.min(this.TRAINING_AREA.maxX, position.x)),
      Math.max(this.TRAINING_AREA.minY, Math.min(this.TRAINING_AREA.maxY, position.y)),
      Math.max(this.TRAINING_AREA.minZ, Math.min(this.TRAINING_AREA.maxZ, position.z))
    );
  }

  private generateRandomPosition(): THREE.Vector3 {
    // Generate position within the defined training area
    const x = this.TRAINING_AREA.minX + Math.random() * (this.TRAINING_AREA.maxX - this.TRAINING_AREA.minX);
    const y = this.TRAINING_AREA.minY + Math.random() * (this.TRAINING_AREA.maxY - this.TRAINING_AREA.minY);
    const z = this.TRAINING_AREA.minZ + Math.random() * (this.TRAINING_AREA.maxZ - this.TRAINING_AREA.minZ);
    
    return new THREE.Vector3(x, y, z);
  }

  // Method to generate position biased towards player's view direction
  private generatePositionInView(): THREE.Vector3 {
    // Get camera direction
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    
    // Project camera direction onto the front wall plane (z = -15 average)
    const targetZ = -15;
    const distanceToWall = Math.abs(targetZ);
    
    // Calculate where the camera is looking on the wall
    const lookAtX = cameraDirection.x * distanceToWall;
    const lookAtY = 1.6 + cameraDirection.y * distanceToWall; // 1.6 is camera height
    
    // Add some randomness around the look-at point
    const spreadX = 3; // 3 units spread
    const spreadY = 2; // 2 units spread
    
    const x = Math.max(this.TRAINING_AREA.minX, Math.min(this.TRAINING_AREA.maxX, 
      lookAtX + (Math.random() - 0.5) * spreadX));
    const y = Math.max(this.TRAINING_AREA.minY, Math.min(this.TRAINING_AREA.maxY, 
      lookAtY + (Math.random() - 0.5) * spreadY));
    const z = targetZ + (Math.random() - 0.5) * 4; // Some depth variation
    
    return new THREE.Vector3(x, y, z);
  }

  public removeTarget(targetId: string): void {
    const target = this.targets.get(targetId);
    if (target) {
      this.targetPool.release(target);
      this.targets.delete(targetId);
    }
  }

  public checkHit(mouseX: number, mouseY: number, canvasWidth: number, canvasHeight: number): { hit: boolean; target?: Target; hitPoint?: THREE.Vector3 } {
    // Convert mouse coordinates to normalized device coordinates (-1 to +1)
    this.mouse.x = (mouseX / canvasWidth) * 2 - 1;
    this.mouse.y = -(mouseY / canvasHeight) * 2 + 1;

    // Set up raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Get all target meshes for intersection testing
    const targetMeshes: THREE.Mesh[] = [];
    this.targets.forEach(target => {
      if (target.isActive()) {
        targetMeshes.push(target.getMesh());
      }
    });

    // Check for intersections
    const intersects = this.raycaster.intersectObjects(targetMeshes);

    if (intersects.length > 0) {
      // Hit detected - get the closest target
      const hitMesh = intersects[0].object as THREE.Mesh;
      const target = hitMesh.userData.target as Target;
      const hitPoint = intersects[0].point;

      if (target && target.isActive()) {
        // Handle hit
        target.onHit();
        
        // Remove hit target immediately for responsive gameplay
        this.removeTarget(target.getId());
        
        // Spawn new target to maintain count (only if spawning is active)
        if (this.isSpawning) {
          this.spawnTarget();
        }

        return { hit: true, target, hitPoint };
      }
    }

    // No hit - show miss effect on background
    const missPoint = this.calculateMissPoint();
    this.showMissEffect(missPoint);

    return { hit: false, hitPoint: missPoint };
  }

  private calculateMissPoint(): THREE.Vector3 {
    // Cast ray into the scene to find where the miss occurred
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    
    // If no intersection, calculate a point along the ray
    const direction = this.raycaster.ray.direction.clone();
    const origin = this.raycaster.ray.origin.clone();
    return origin.add(direction.multiplyScalar(10));
  }

  private showMissEffect(hitPoint: THREE.Vector3): void {
    // Create temporary miss effect
    const missGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const missMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.8
    });

    const missEffect = new THREE.Mesh(missGeometry, missMaterial);
    missEffect.position.copy(hitPoint);
    this.scene.add(missEffect);

    // Animate and remove miss effect
    const startTime = Date.now();
    const duration = 400;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (missEffect) {
        // Fade out and scale up slightly
        missMaterial.opacity = 0.8 * (1 - progress);
        missEffect.scale.setScalar(1 + progress * 0.3);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Remove miss effect
          this.scene.remove(missEffect);
          missGeometry.dispose();
          missMaterial.dispose();
        }
      }
    };

    animate();
  }

  public updateTargets(deltaTime: number): void {
    // Update all active targets
    this.targets.forEach(target => {
      if (target.isActive()) {
        target.update(deltaTime);
      }
    });
  }

  public getActiveTargets(): Target[] {
    const activeTargets: Target[] = [];
    this.targets.forEach(target => {
      if (target.isActive()) {
        activeTargets.push(target);
      }
    });
    return activeTargets;
  }

  public getTargetCount(): number {
    return this.targets.size;
  }

  public getActiveTargetCount(): number {
    return this.getActiveTargets().length;
  }

  public setMaxTargets(count: number): void {
    this.maxTargets = Math.max(1, Math.min(10, count)); // Limit between 1-10
    
    // Adjust current target count
    const currentActive = this.getActiveTargetCount();
    if (currentActive < this.maxTargets) {
      // Spawn more targets
      for (let i = currentActive; i < this.maxTargets; i++) {
        this.spawnTarget();
      }
    } else if (currentActive > this.maxTargets) {
      // Remove excess targets
      const activeTargets = this.getActiveTargets();
      for (let i = this.maxTargets; i < activeTargets.length; i++) {
        this.removeTarget(activeTargets[i].getId());
      }
    }
  }

  public setTargetSize(size: number): void {
    this.targetSize = Math.max(0.1, Math.min(2.0, size)); // Limit between 0.1-2.0
  }

  public setSpawnRadius(radius: number): void {
    // Update training area bounds based on radius
    const clampedRadius = Math.max(3, Math.min(15, radius));
    this.TRAINING_AREA.minX = -clampedRadius;
    this.TRAINING_AREA.maxX = clampedRadius;
    this.TRAINING_AREA.minZ = -clampedRadius - 5; // Keep some distance
    this.TRAINING_AREA.maxZ = -5; // Minimum distance from player
  }

  public clearAllTargets(): void {
    this.targets.forEach(target => {
      this.targetPool.release(target);
    });
    this.targets.clear();
  }

  public reset(): void {
    this.clearAllTargets();
    this.stopSpawning();
  }

  public startSpawning(): void {
    if (this.isSpawning) return;
    
    this.isSpawning = true;
    this.setupInitialTargets();
    
    // Set up continuous spawning
    this.spawnInterval = window.setInterval(() => {
      const currentActive = this.getActiveTargetCount();
      if (currentActive < this.maxTargets) {
        this.spawnTarget();
      }
    }, 1000); // Check every second
  }

  public stopSpawning(): void {
    this.isSpawning = false;
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = null;
    }
    this.clearAllTargets();
  }

  public dispose(): void {
    this.stopSpawning();
    this.clearAllTargets();
    this.targetPool.dispose();
  }

  // Performance optimization methods
  public getPoolStats(): { active: number; pooled: number; total: number } {
    return this.targetPool.getStats();
  }

  public preloadTargets(count: number): void {
    this.targetPool.preload(count);
  }

  public setMaxPoolSize(size: number): void {
    this.targetPool.setMaxPoolSize(size);
  }

  public setTargetComplexity(complexity: number): void {
    // This would affect how detailed the target geometry is
    // For now, we'll store it for future use when creating targets
    // In a more advanced implementation, this would affect the geometry detail
    console.log(`Target complexity set to: ${complexity}`);
  }

  public getTrainingAreaBounds(): typeof this.TRAINING_AREA {
    return { ...this.TRAINING_AREA };
  }

  public getTargetPositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    this.targets.forEach(target => {
      if (target.isActive()) {
        positions.push(target.getPosition());
      }
    });
    return positions;
  }
}