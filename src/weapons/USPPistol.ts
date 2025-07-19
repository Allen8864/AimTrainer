import * as THREE from 'three';
import { OBJLoader } from 'three-stdlib';

export class USPPistol {
  private group: THREE.Group;
  private muzzleFlash: THREE.Mesh | null = null;
  private isAnimating: boolean = false;
  private isModelLoaded: boolean = false;
  private shellCasings: THREE.Mesh[] = [];

  // Enhanced recoil system
  private recoilAccumulation: number = 0;
  private lastShotTime: number = 0;
  private consecutiveShots: number = 0;

  // Recoil offset system (applied on top of camera follow)
  private recoilOffset: THREE.Vector3 = new THREE.Vector3();
  private recoilRotationOffset: THREE.Euler = new THREE.Euler();

  // Camera shake callback
  private onCameraShake?: (intensity: number, duration: number) => void;

  constructor(onCameraShake?: (intensity: number, duration: number) => void) {
    this.group = new THREE.Group();
    this.onCameraShake = onCameraShake;

    // Load the actual 3D model
    this.loadWeaponModel();

    // Position the weapon
    this.positionWeapon();

    // Create muzzle flash effect
    this.createMuzzleFlash();
  }

  private async loadWeaponModel(): Promise<void> {
    try {

      // Load textures first
      const textureLoader = new THREE.TextureLoader();
      const baseColorTexture = await this.loadTexture(textureLoader, '/weapons/M_G43_baseColor.png');
      const normalTexture = await this.loadTexture(textureLoader, '/weapons/M_G43_normal.png');
      const metallicRoughnessTexture = await this.loadTexture(textureLoader, '/weapons/M_G43_metallicRoughness.png');

      // Load OBJ model
      const objLoader = new OBJLoader();
      const weaponModel = await this.loadOBJModel(objLoader, '/weapons/gun.obj');

      // Apply materials to the model
      weaponModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Create material with loaded textures
          const material = new THREE.MeshStandardMaterial({
            map: baseColorTexture,
            normalMap: normalTexture,
            metalnessMap: metallicRoughnessTexture,
            roughnessMap: metallicRoughnessTexture,
            metalness: 0.8,
            roughness: 0.4
          });

          child.material = material;
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      // Scale and orient the model appropriately
      weaponModel.scale.set(0.1, 0.1, 0.1); // Adjust scale as needed
      weaponModel.rotation.set(0, 0, 0); // Rotate if needed

      this.group.add(weaponModel);
      this.isModelLoaded = true;
    } catch (error) {
      // Fallback to simple geometry
      this.createFallbackWeapon();
    }
  }

  private loadTexture(loader: THREE.TextureLoader, url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (texture) => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          resolve(texture);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  private loadOBJModel(loader: OBJLoader, url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (object) => resolve(object),
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  private createFallbackWeapon(): void {

    // Create a simple but visible fallback weapon
    const weaponGroup = new THREE.Group();

    // Main body
    const bodyGeometry = new THREE.BoxGeometry(0.2, 0.5, 1.0);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.set(0, -0.1, 0);
    weaponGroup.add(bodyMesh);

    // Barrel
    const barrelGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.8);
    const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const barrelMesh = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrelMesh.position.set(0, 0.15, 0.4);
    weaponGroup.add(barrelMesh);

    // Bright sight
    const sightGeometry = new THREE.BoxGeometry(0.02, 0.1, 0.03);
    const sightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sightMesh = new THREE.Mesh(sightGeometry, sightMaterial);
    sightMesh.position.set(0, 0.25, 0.7);
    weaponGroup.add(sightMesh);

    this.group.add(weaponGroup);
    this.isModelLoaded = true;
  }

  private positionWeapon(): void {
    // Position the weapon group for first-person view relative to camera
    // Make it very obvious and visible
    this.group.position.set(0.5, -0.7, -1.2); // Right side, lower position, very close to camera
    this.group.rotation.set(-0.3, 0.3, 0.5); // Tilted for FPS view, more left tilt
    this.group.scale.set(0.8, 0.8, 0.8); // Normal scale first
  }

  private createMuzzleFlash(): void {
    // Create muzzle flash geometry
    const flashGeometry = new THREE.ConeGeometry(0.015, 0.06, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0
    });

    this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
    // Position muzzle flash at the barrel end
    // Moving towards green direction (X negative) from current position
    // Previous: (0, 0.55, -1.2), moving X by -0.1 towards green marker
    this.muzzleFlash.position.set(-0.1, 0.55, -1.2); // X decreased from 0 to -0.1
    this.muzzleFlash.rotation.set(0, 0, Math.PI / 2); // Point forward
    this.group.add(this.muzzleFlash);
  }

  public fire(): void {
    // Update shot timing and accumulation first
    this.updateRecoilAccumulation();

    // Always allow firing - use additive recoil system
    this.addRecoilImpulse();

    // Muzzle flash effect
    this.showMuzzleFlash();

    // Shell casing ejection
    this.ejectShellCasing();

    // Trigger camera shake if callback is provided
    this.triggerCameraShake();
  }

  private addRecoilImpulse(): void {
    // Calculate recoil intensity based on accumulation
    const baseRecoilDistance = 0.08;
    const baseRecoilUpward = 0.06;
    const accumulationMultiplier = 1 + (this.recoilAccumulation * 0.4);

    // Calculate recoil impulse
    const recoilDistance = baseRecoilDistance * accumulationMultiplier;
    const recoilUpward = baseRecoilUpward * accumulationMultiplier;
    const recoilSideways = (Math.random() - 0.5) * 0.02 * accumulationMultiplier;

    // Add to current recoil offset (additive system)
    this.recoilOffset.x += recoilSideways;
    this.recoilOffset.y += recoilUpward;
    this.recoilOffset.z -= recoilDistance;

    // Add rotational recoil
    this.recoilRotationOffset.x += 0.1 * accumulationMultiplier; // Muzzle rise (向上)
    this.recoilRotationOffset.y += (Math.random() - 0.5) * 0.04 * accumulationMultiplier;
    this.recoilRotationOffset.z += (Math.random() - 0.5) * 0.02;

    // Add weapon sway for rapid fire
    if (this.consecutiveShots > 2) {
      const swayIntensity = Math.min(this.consecutiveShots * 0.01, 0.06);
      this.recoilRotationOffset.y += (Math.random() - 0.5) * swayIntensity;
      this.recoilRotationOffset.z += (Math.random() - 0.5) * swayIntensity * 0.5;
    }

    // Start recovery animation if not already running
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.startRecoilRecovery();
    }
  }

  private startRecoilRecovery(): void {

    const recoverySpeed = 0.95; // How fast to recover (0.95 = 5% reduction per frame)
    const minThreshold = 0.001; // Minimum offset before stopping recovery

    const recover = () => {
      // Gradually reduce recoil offset
      this.recoilOffset.multiplyScalar(recoverySpeed);
      this.recoilRotationOffset.x *= recoverySpeed;
      this.recoilRotationOffset.y *= recoverySpeed;
      this.recoilRotationOffset.z *= recoverySpeed;

      // Check if recovery is complete
      const totalOffset = this.recoilOffset.length() +
        Math.abs(this.recoilRotationOffset.x) +
        Math.abs(this.recoilRotationOffset.y) +
        Math.abs(this.recoilRotationOffset.z);

      if (totalOffset > minThreshold && this.isAnimating) {
        requestAnimationFrame(recover);
      } else {
        // Recovery complete
        this.recoilOffset.set(0, 0, 0);
        this.recoilRotationOffset.set(0, 0, 0);
        this.isAnimating = false;

        // Gradually reduce accumulation over time
        setTimeout(() => {
          this.recoilAccumulation = Math.max(0, this.recoilAccumulation - 0.15);
        }, 300);
      }
    };

    recover();
  }

  private triggerCameraShake(): void {
    if (!this.onCameraShake) return;

    // Calculate shake intensity based on recoil accumulation
    const baseIntensity = 0.002; // Base shake intensity
    const accumulationMultiplier = 1 + (this.recoilAccumulation * 0.3);
    const shakeIntensity = baseIntensity * accumulationMultiplier;

    // Shake duration based on consecutive shots
    const baseDuration = 100;
    const shakeDuration = Math.min(baseDuration + (this.consecutiveShots * 20), 300);

    this.onCameraShake(shakeIntensity, shakeDuration);
  }

  private ejectShellCasing(): void {
    // Create shell casing geometry
    const casingGeometry = new THREE.CylinderGeometry(0.003, 0.004, 0.015, 8);
    const casingMaterial = new THREE.MeshBasicMaterial({
      color: 0xDAA520, // Golden brass color
      transparent: true,
      opacity: 0.9
    });

    const shellCasing = new THREE.Mesh(casingGeometry, casingMaterial);

    // Position shell casing at ejection port (right side of weapon)
    const ejectionPosition = new THREE.Vector3();
    this.group.getWorldPosition(ejectionPosition);
    ejectionPosition.x += 0.1; // Right side
    ejectionPosition.y += 0.05; // Slightly up
    ejectionPosition.z -= 0.2; // Slightly back

    shellCasing.position.copy(ejectionPosition);

    // Random rotation for realism
    shellCasing.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Add to scene (assuming parent scene exists)
    if (this.group.parent) {
      this.group.parent.add(shellCasing);
      this.shellCasings.push(shellCasing);
    }

    // Animate shell casing trajectory
    this.animateShellCasing(shellCasing);

    // Clean up old casings (keep only last 10)
    if (this.shellCasings.length > 10) {
      const oldCasing = this.shellCasings.shift();
      if (oldCasing && oldCasing.parent) {
        oldCasing.parent.remove(oldCasing);
        oldCasing.geometry.dispose();
        (oldCasing.material as THREE.Material).dispose();
      }
    }
  }

  private animateShellCasing(casing: THREE.Mesh): void {
    const startPosition = casing.position.clone();
    const startRotation = casing.rotation.clone();

    // Calculate trajectory (arc with gravity)
    const velocity = new THREE.Vector3(
      0.3 + Math.random() * 0.2, // Right velocity
      0.2 + Math.random() * 0.1, // Up velocity
      -0.1 - Math.random() * 0.1  // Back velocity
    );

    const gravity = -0.8;
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        // Fade out and remove
        const material = casing.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, material.opacity - 0.02);

        if (material.opacity <= 0) {
          if (casing.parent) {
            casing.parent.remove(casing);
          }
          casing.geometry.dispose();
          material.dispose();

          // Remove from tracking array
          const index = this.shellCasings.indexOf(casing);
          if (index > -1) {
            this.shellCasings.splice(index, 1);
          }
        } else {
          requestAnimationFrame(animate);
        }
        return;
      }

      // Update position with physics
      const t = progress;
      casing.position.x = startPosition.x + velocity.x * t;
      casing.position.y = startPosition.y + velocity.y * t + 0.5 * gravity * t * t;
      casing.position.z = startPosition.z + velocity.z * t;

      // Update rotation (spinning)
      casing.rotation.x = startRotation.x + t * 10;
      casing.rotation.y = startRotation.y + t * 8;
      casing.rotation.z = startRotation.z + t * 12;

      requestAnimationFrame(animate);
    };

    animate();
  }

  private updateRecoilAccumulation(): void {
    const currentTime = Date.now();
    const timeSinceLastShot = currentTime - this.lastShotTime;

    // Reset accumulation if enough time has passed (1 second)
    if (timeSinceLastShot > 1000) {
      this.recoilAccumulation = 0;
      this.consecutiveShots = 0;
    } else {
      // Increase accumulation for rapid fire
      this.consecutiveShots++;
      this.recoilAccumulation = Math.min(this.recoilAccumulation + 0.3, 2.0); // Cap at 2.0
    }

    this.lastShotTime = currentTime;
  }







  private showMuzzleFlash(): void {
    if (!this.muzzleFlash) {
      return;
    }
    const material = this.muzzleFlash.material as THREE.MeshBasicMaterial;

    // Show flash with higher opacity
    material.opacity = 1.0;
    material.color.setHex(0xffff00); // Bright yellow

    // Randomize flash size and rotation for variety
    const scale = 1.5 + Math.random() * 1.0; // Larger flash
    this.muzzleFlash.scale.set(scale, scale, scale);
    this.muzzleFlash.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5;

    // Fade out flash
    const fadeStart = Date.now();
    const fadeDuration = 120; // Slightly longer duration

    const fadeOut = () => {
      const elapsed = Date.now() - fadeStart;
      const progress = Math.min(elapsed / fadeDuration, 1);

      material.opacity = 1.0 * (1 - progress);

      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        material.opacity = 0;
      }
    };

    fadeOut();
  }

  public updateCameraFollow(camera: THREE.Camera): void {
    // Only update if model is loaded
    if (!this.isModelLoaded) return;

    // Update weapon position to follow camera in world space
    const cameraWorldPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPosition);

    const cameraWorldQuaternion = new THREE.Quaternion();
    camera.getWorldQuaternion(cameraWorldQuaternion);

    // Calculate weapon offset in camera's local space
    const weaponOffset = new THREE.Vector3(0.5, -0.7, -1.2);
    weaponOffset.applyQuaternion(cameraWorldQuaternion);

    // Set base weapon position relative to camera
    const basePosition = cameraWorldPosition.clone().add(weaponOffset);

    // Apply recoil offset on top of base position
    this.group.position.copy(basePosition).add(this.recoilOffset);

    // Set base rotation from camera
    this.group.quaternion.copy(cameraWorldQuaternion);

    // Apply recoil rotation offset
    const baseRotation = new THREE.Euler().setFromQuaternion(cameraWorldQuaternion);
    const finalRotation = new THREE.Euler(
      baseRotation.x + this.recoilRotationOffset.x,
      baseRotation.y + this.recoilRotationOffset.y,
      baseRotation.z + this.recoilRotationOffset.z,
      baseRotation.order
    );
    this.group.rotation.copy(finalRotation);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getMuzzlePosition(): THREE.Vector3 {
    const muzzlePosition = new THREE.Vector3();

    if (this.muzzleFlash) {
      // Get the world position of the muzzle flash
      this.muzzleFlash.getWorldPosition(muzzlePosition);
    } else {
      // Calculate approximate muzzle position based on weapon group
      this.group.getWorldPosition(muzzlePosition);

      // Apply forward offset for barrel end
      // Transform the offset by the weapon's current rotation
      const forwardOffset = new THREE.Vector3(-0.1, 0.55, -1.2); // Same as muzzle flash position
      forwardOffset.applyQuaternion(this.group.quaternion);
      muzzlePosition.add(forwardOffset);
    }

    return muzzlePosition;
  }

  public getMuzzleDirection(): THREE.Vector3 {
    // Get the forward direction of the weapon
    const direction = new THREE.Vector3(0, 0, -1); // Local forward direction (negative Z) - reversed

    // Transform by weapon's world rotation
    const worldQuaternion = new THREE.Quaternion();
    this.group.getWorldQuaternion(worldQuaternion);
    direction.applyQuaternion(worldQuaternion);

    return direction;
  }

  public setCameraShakeCallback(callback: (intensity: number, duration: number) => void): void {
    this.onCameraShake = callback;
  }

  public getRecoilAccumulation(): number {
    return this.recoilAccumulation;
  }

  public getConsecutiveShots(): number {
    return this.consecutiveShots;
  }

  public dispose(): void {
    // Clean up shell casings
    this.shellCasings.forEach(casing => {
      if (casing.parent) {
        casing.parent.remove(casing);
      }
      casing.geometry.dispose();
      (casing.material as THREE.Material).dispose();
    });
    this.shellCasings.length = 0;

    // Clean up geometries and materials
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              // Dispose textures if they exist
              if (material.map) material.map.dispose();
              if (material.normalMap) material.normalMap.dispose();
              if (material.metalnessMap) material.metalnessMap.dispose();
              if (material.roughnessMap) material.roughnessMap.dispose();
              material.dispose();
            });
          } else {
            // Dispose textures if they exist
            if (child.material.map) child.material.map.dispose();
            if (child.material.normalMap) child.material.normalMap.dispose();
            if (child.material.metalnessMap) child.material.metalnessMap.dispose();
            if (child.material.roughnessMap) child.material.roughnessMap.dispose();
            child.material.dispose();
          }
        }
      }
    });

    // Remove from parent if it has one
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}

export default USPPistol;