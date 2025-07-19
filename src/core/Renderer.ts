import * as THREE from 'three';
import { USPPistol } from '../weapons/USPPistol';
import { TrainingEnvironment } from '../environment/TrainingEnvironment';
import type { QualitySettings } from '../managers/PerformanceManager';

export class Renderer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private isWebGLSupported: boolean = false;
  private uspPistol: USPPistol | null = null;
  private trainingEnvironment: TrainingEnvironment | null = null;
  
  // First-person camera controls
  private cameraRotation = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.isWebGLSupported = this.checkWebGLSupport();
    
    if (!this.isWebGLSupported) {
      this.showWebGLError();
      throw new Error('WebGL is not supported');
    }

    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initEnvironment();
    this.initLights();
    this.initWeapon();
    this.setupEventListeners();
  }

  private checkWebGLSupport(): boolean {
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  private showWebGLError(): void {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff4444;
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        z-index: 1000;
        font-family: Arial, sans-serif;
      ">
        <h3>WebGL Not Supported</h3>
        <p>Your browser doesn't support WebGL, which is required for this 3D aim trainer.</p>
        <p>Please update your browser or try a different one.</p>
        <p>Supported browsers: Chrome, Firefox, Safari, Edge</p>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x505050); // Much brighter background
    this.scene.fog = new THREE.Fog(0x505050, 40, 80); // Lighter fog, further distance
  }

  private initEnvironment(): void {
    // Create and add training environment
    this.trainingEnvironment = new TrainingEnvironment();
    this.scene.add(this.trainingEnvironment.getGroup());
  }

  private initCamera(): void {
    // Use window dimensions for accurate aspect ratio
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.01, 1000); // Adjusted near plane for weapon visibility
    
    // Position camera at eye level for first-person view
    this.camera.position.set(0, 1.6, 0); // 1.6m height, centered
    this.camera.rotation.order = 'YXZ'; // Yaw-Pitch-Roll order for FPS controls
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    
    // Use window dimensions for accurate sizing
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private initLights(): void {
    // Very bright ambient light for excellent visibility
    const ambientLight = new THREE.AmbientLight(0x808080, 1.0);
    this.scene.add(ambientLight);

    // Main directional light (simulating bright overhead lighting)
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(0, 20, 10);
    mainLight.castShadow = true;
    
    // Configure shadow properties for better coverage
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 80;
    mainLight.shadow.camera.left = -40;
    mainLight.shadow.camera.right = 40;
    mainLight.shadow.camera.top = 40;
    mainLight.shadow.camera.bottom = -40;
    mainLight.shadow.bias = -0.0001;
    
    this.scene.add(mainLight);

    // Multiple directional lights for even illumination
    const fillLights = [
      { pos: [-15, 12, -15], intensity: 1.0 },
      { pos: [15, 12, -15], intensity: 1.0 },
      { pos: [-15, 12, 15], intensity: 0.8 },
      { pos: [15, 12, 15], intensity: 0.8 }
    ];

    fillLights.forEach(light => {
      const dirLight = new THREE.DirectionalLight(0xffffff, light.intensity);
      dirLight.position.set(light.pos[0], light.pos[1], light.pos[2]);
      this.scene.add(dirLight);
    });

    // Bright ceiling lights throughout the facility
    const ceilingLights = [
      { pos: [-12, 7.5, -12], intensity: 1.5 },
      { pos: [12, 7.5, -12], intensity: 1.5 },
      { pos: [-12, 7.5, 12], intensity: 1.2 },
      { pos: [12, 7.5, 12], intensity: 1.2 },
      { pos: [0, 7.5, 0], intensity: 2.0 },
      { pos: [-6, 7.5, -18], intensity: 1.8 },
      { pos: [6, 7.5, -18], intensity: 1.8 }
    ];

    ceilingLights.forEach(light => {
      const pointLight = new THREE.PointLight(0xffffff, light.intensity, 30);
      pointLight.position.set(light.pos[0], light.pos[1], light.pos[2]);
      // Reduce shadows for better performance and brighter scene
      pointLight.castShadow = false;
      this.scene.add(pointLight);
    });

    // Bright front wall lighting for excellent target visibility
    const targetLights = [
      { pos: [-8, 6, -18], intensity: 2.0 },
      { pos: [8, 6, -18], intensity: 2.0 },
      { pos: [0, 6, -18], intensity: 2.5 }
    ];

    targetLights.forEach(light => {
      const spotLight = new THREE.SpotLight(0xffffff, light.intensity, 35, Math.PI / 4, 0.2);
      spotLight.position.set(light.pos[0], light.pos[1], light.pos[2]);
      spotLight.target.position.set(light.pos[0], 3, -24);
      spotLight.castShadow = false; // Disable shadows for brighter lighting
      this.scene.add(spotLight);
      this.scene.add(spotLight.target);
    });

    // Additional hemisphere light for natural lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);
  }

  private initWeapon(): void {
    // Initialize USP pistol and add to scene
    this.uspPistol = new USPPistol();
    
    // Ensure weapon is visible
    const weaponGroup = this.uspPistol.getGroup();
    weaponGroup.visible = true;
    
    // Add weapon directly to scene
    this.scene.add(weaponGroup);
    
    // Position weapon in world space relative to camera starting position
    weaponGroup.position.set(0.5, 1.2, -1.2); // World position: right of camera, at eye level, in front
    
    console.log('Weapon initialized and added to scene');
    console.log('Weapon group children count:', weaponGroup.children.length);
    console.log('Weapon group visible:', weaponGroup.visible);
    console.log('Weapon world position:', weaponGroup.position);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  public handleResize(): void {
    // Use window dimensions for accurate sizing, especially in fullscreen
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update canvas size
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(width, height, false); // false to prevent setting canvas style
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  public render(): void {
    // Update camera rotation
    this.updateCameraRotation();
    
    // Update weapon to follow camera movement
    if (this.uspPistol) {
      this.uspPistol.updateCameraFollow(this.camera);
    }
    
    // Debug: Log weapon visibility occasionally
    if (this.uspPistol && Date.now() % 2000 < 16) { // Every 2 seconds
      const weaponGroup = this.uspPistol.getGroup();
      console.log('Weapon debug - Visible:', weaponGroup.visible, 'Children:', weaponGroup.children.length);
      console.log('Camera children count:', this.camera.children.length);
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  private updateCameraRotation(): void {
    // Apply rotation to camera for first-person view
    this.camera.rotation.x = this.cameraRotation.x;
    this.camera.rotation.y = this.cameraRotation.y;
  }

  public updateCameraFromMouse(movementX: number, movementY: number, sensitivity: number): void {
    // Convert mouse movement to camera rotation
    const rotationSpeed = 0.002 * sensitivity; // Base rotation speed
    
    // Update horizontal rotation (yaw) - full 360 degree freedom
    this.cameraRotation.y -= movementX * rotationSpeed;
    
    // Update vertical rotation (pitch) - limit to prevent flipping upside down
    this.cameraRotation.x -= movementY * rotationSpeed;
    // Clamp vertical rotation to prevent camera flipping (gimbal lock)
    this.cameraRotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraRotation.x));
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.Camera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getUSPPistol(): USPPistol | null {
    return this.uspPistol;
  }

  public fireWeapon(): void {
    if (this.uspPistol) {
      this.uspPistol.fire();
    }
  }

  public applyQualitySettings(settings: QualitySettings): void {
    // Apply pixel ratio
    this.renderer.setPixelRatio(settings.pixelRatio);
    
    // Apply shadow settings
    this.renderer.shadowMap.enabled = settings.shadowsEnabled;
    
    // Update shadow map sizes for all lights in the scene
    this.scene.traverse((object) => {
      if (object instanceof THREE.DirectionalLight || object instanceof THREE.SpotLight) {
        if (object.shadow) {
          object.shadow.mapSize.width = settings.shadowMapSize;
          object.shadow.mapSize.height = settings.shadowMapSize;
          object.shadow.map?.dispose(); // Dispose old shadow map
          object.shadow.map = null; // Force recreation
        }
      }
    });

    // Apply antialias setting (note: this requires renderer recreation for full effect)
    // For now, we'll just log it as antialias is set during renderer creation
    if (!settings.antialias && this.renderer.getContext().getContextAttributes()?.antialias) {
      console.log('Antialias setting changed - restart may be required for full effect');
    }

    console.log('Quality settings applied to renderer:', settings);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    // Dispose of weapon
    if (this.uspPistol) {
      this.uspPistol.dispose();
      this.uspPistol = null;
    }
    
    this.renderer.dispose();
  }
}