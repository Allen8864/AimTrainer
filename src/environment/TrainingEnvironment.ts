import * as THREE from 'three';

export class TrainingEnvironment {
  private group: THREE.Group;
  private floor: THREE.Mesh | null = null;
  private walls: THREE.Mesh[] = [];
  private ceiling: THREE.Mesh | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.createEnvironment();
  }

  private createEnvironment(): void {
    this.createFloor();
    this.createWalls();
    this.createCeiling();
    this.addEnvironmentDetails();
  }

  private createFloor(): void {
    // Create a large floor with grid pattern
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    
    // Create floor material with grid texture - brighter color
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x707070,
      roughness: 0.8,
      metalness: 0.1
    });

    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.floor.position.y = 0;
    this.floor.receiveShadow = true;

    // Add grid lines
    this.addFloorGrid();
    
    this.group.add(this.floor);
  }

  private addFloorGrid(): void {
    // Create grid helper for floor lines
    const gridHelper = new THREE.GridHelper(50, 50, 0x666666, 0x333333);
    gridHelper.position.y = 0.01; // Slightly above floor to prevent z-fighting
    this.group.add(gridHelper);
  }

  private createWalls(): void {
    const wallHeight = 8;
    const wallDistance = 25; // Distance from center
    
    // Wall material - brighter concrete-like appearance
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.7,
      metalness: 0.1
    });

    // Front wall (where targets will be)
    const frontWallGeometry = new THREE.PlaneGeometry(50, wallHeight);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, wallHeight / 2, -wallDistance);
    frontWall.receiveShadow = true;
    this.walls.push(frontWall);
    this.group.add(frontWall);

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(50, wallHeight);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2, wallDistance);
    backWall.rotation.y = Math.PI; // Face inward
    backWall.receiveShadow = true;
    this.walls.push(backWall);
    this.group.add(backWall);

    // Left wall
    const leftWallGeometry = new THREE.PlaneGeometry(50, wallHeight);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-wallDistance, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2; // Face inward
    leftWall.receiveShadow = true;
    this.walls.push(leftWall);
    this.group.add(leftWall);

    // Right wall
    const rightWallGeometry = new THREE.PlaneGeometry(50, wallHeight);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(wallDistance, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2; // Face inward
    rightWall.receiveShadow = true;
    this.walls.push(rightWall);
    this.group.add(rightWall);
  }

  private createCeiling(): void {
    // Create ceiling - brighter color
    const ceilingGeometry = new THREE.PlaneGeometry(50, 50);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x909090,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    this.ceiling.rotation.x = Math.PI / 2; // Rotate to be horizontal
    this.ceiling.position.y = 8; // 8 meters high
    this.ceiling.receiveShadow = true;
    
    this.group.add(this.ceiling);
  }

  private addEnvironmentDetails(): void {
    // Simplified environment without decorative elements
  }



  public getGroup(): THREE.Group {
    return this.group;
  }

  public getFrontWallPosition(): number {
    return -25; // Z position of front wall
  }

  public getFloorLevel(): number {
    return 0; // Y position of floor
  }

  public getWallHeight(): number {
    return 8;
  }

  public getRoomBounds(): { 
    minX: number, maxX: number, 
    minZ: number, maxZ: number, 
    minY: number, maxY: number 
  } {
    return {
      minX: -25,
      maxX: 25,
      minZ: -25,
      maxZ: 25,
      minY: 0,
      maxY: 8
    };
  }

  public dispose(): void {
    // Clean up geometries and materials
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    // Remove from parent if it has one
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }

    // Clear arrays
    this.walls = [];
    this.floor = null;
    this.ceiling = null;
  }
}

export default TrainingEnvironment;