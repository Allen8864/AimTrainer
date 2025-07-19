import * as THREE from 'three';

export interface ParticleConfig {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: number;
  size: number;
  lifetime: number;
  gravity?: number;
  spread?: number;
}

export class Particle {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public color: THREE.Color;
  public size: number;
  public lifetime: number;
  public maxLifetime: number;
  public gravity: number;
  public mesh: THREE.Mesh;

  constructor(config: Partial<ParticleConfig> = {}) {
    this.position = config.position?.clone() || new THREE.Vector3();
    this.velocity = config.velocity?.clone() || new THREE.Vector3();
    this.color = new THREE.Color(config.color || 0xffffff);
    this.size = config.size || 0.1;
    this.lifetime = config.lifetime || 1.0;
    this.maxLifetime = this.lifetime;
    this.gravity = config.gravity || -9.8;

    // Create particle mesh
    const geometry = new THREE.SphereGeometry(this.size, 4, 4);
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 1.0
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
  }

  update(deltaTime: number): boolean {
    // Update lifetime
    this.lifetime -= deltaTime;
    
    if (this.lifetime <= 0) {
      return false; // Particle is dead
    }

    // Update physics
    this.velocity.y += this.gravity * deltaTime;
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Update opacity based on lifetime
    const lifetimeRatio = this.lifetime / this.maxLifetime;
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = lifetimeRatio;
    
    // Update size (shrink over time)
    const sizeScale = 0.5 + (lifetimeRatio * 0.5);
    this.mesh.scale.setScalar(sizeScale);

    return true; // Particle is still alive
  }

  dispose(): void {
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    if (this.mesh.material) {
      (this.mesh.material as THREE.Material).dispose();
    }
  }
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private maxParticles: number = 100;

  constructor(scene: THREE.Scene, maxParticles: number = 100) {
    this.scene = scene;
    this.maxParticles = maxParticles;
  }

  createHitEffect(position: THREE.Vector3, color: number = 0xff6600): void {
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 2 + 1, // Upward velocity
        Math.sin(angle) * speed
      );

      this.createParticle({
        position: position.clone(),
        velocity,
        color,
        size: 0.05 + Math.random() * 0.05,
        lifetime: 0.5 + Math.random() * 0.5,
        gravity: -5
      });
    }
  }

  createMissEffect(position: THREE.Vector3): void {
    const particleCount = 4;
    
    for (let i = 0; i < particleCount; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1,
        (Math.random() - 0.5) * 2
      );

      this.createParticle({
        position: position.clone(),
        velocity,
        color: 0xff4444,
        size: 0.03 + Math.random() * 0.02,
        lifetime: 0.3 + Math.random() * 0.3,
        gravity: -3
      });
    }
  }

  createMuzzleFlash(position: THREE.Vector3, direction: THREE.Vector3): void {
    const particleCount = 6;
    
    for (let i = 0; i < particleCount; i++) {
      const spread = 0.3;
      const velocity = direction.clone()
        .multiplyScalar(3 + Math.random() * 2)
        .add(new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread
        ));

      this.createParticle({
        position: position.clone(),
        velocity,
        color: 0xffaa00,
        size: 0.08 + Math.random() * 0.04,
        lifetime: 0.1 + Math.random() * 0.1,
        gravity: 0
      });
    }
  }

  createExplosionEffect(position: THREE.Vector3, intensity: number = 1.0): void {
    const particleCount = Math.floor(12 * intensity);
    
    for (let i = 0; i < particleCount; i++) {
      // Random spherical distribution
      const phi = Math.random() * Math.PI * 2;
      const cosTheta = Math.random() * 2 - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      const speed = (2 + Math.random() * 4) * intensity;
      
      const velocity = new THREE.Vector3(
        sinTheta * Math.cos(phi) * speed,
        sinTheta * Math.sin(phi) * speed,
        cosTheta * speed
      );

      this.createParticle({
        position: position.clone(),
        velocity,
        color: Math.random() > 0.5 ? 0xff6600 : 0xffaa00,
        size: (0.06 + Math.random() * 0.06) * intensity,
        lifetime: (0.4 + Math.random() * 0.6) * intensity,
        gravity: -4
      });
    }
  }

  private createParticle(config: ParticleConfig): void {
    if (this.particles.length >= this.maxParticles) {
      return; // Don't exceed max particles
    }

    let particle: Particle;
    
    // Try to reuse from pool
    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop()!;
      // Reset particle properties
      particle.position.copy(config.position);
      particle.velocity.copy(config.velocity);
      particle.color.setHex(config.color);
      particle.size = config.size;
      particle.lifetime = config.lifetime;
      particle.maxLifetime = config.lifetime;
      particle.gravity = config.gravity || -9.8;
      
      // Update mesh
      particle.mesh.position.copy(particle.position);
      particle.mesh.scale.setScalar(1);
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(particle.color);
      material.opacity = 1.0;
    } else {
      particle = new Particle(config);
    }

    this.particles.push(particle);
    this.scene.add(particle.mesh);
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      if (!particle.update(deltaTime)) {
        // Particle is dead, remove it
        this.scene.remove(particle.mesh);
        this.particles.splice(i, 1);
        
        // Return to pool for reuse
        if (this.particlePool.length < 20) {
          this.particlePool.push(particle);
        } else {
          particle.dispose();
        }
      }
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  setMaxParticles(max: number): void {
    this.maxParticles = Math.max(10, Math.min(500, max));
  }

  clear(): void {
    // Remove all particles from scene
    this.particles.forEach(particle => {
      this.scene.remove(particle.mesh);
      particle.dispose();
    });
    
    // Clear pools
    this.particles = [];
    this.particlePool.forEach(particle => particle.dispose());
    this.particlePool = [];
  }

  dispose(): void {
    this.clear();
  }
}