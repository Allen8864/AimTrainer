import { vi } from 'vitest'

// Mock Three.js
vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn(),
    dispose: vi.fn()
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn(), copy: vi.fn() },
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
    aspect: 1,
    fov: 75,
    near: 0.1,
    far: 1000
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
    shadowMap: { enabled: false, type: 'PCFSoftShadowMap' },
    outputColorSpace: 'srgb',
    toneMapping: 'ACESFilmicToneMapping',
    toneMappingExposure: 1
  })),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn() },
    castShadow: false,
    shadow: {
      mapSize: { width: 1024, height: 1024 },
      camera: {
        near: 0.5,
        far: 50,
        left: -10,
        right: 10,
        top: 10,
        bottom: -10
      }
    }
  })),
  AmbientLight: vi.fn(() => ({})),
  SphereGeometry: vi.fn(() => ({})),
  MeshStandardMaterial: vi.fn(() => ({})),
  MeshLambertMaterial: vi.fn(() => ({
    color: 0xff6600,
    transparent: false,
    opacity: 1
  })),
  MeshBasicMaterial: vi.fn(() => ({
    color: 0xff4444,
    transparent: true,
    opacity: 0.8
  })),
  RingGeometry: vi.fn(() => ({})),
  Mesh: vi.fn(() => ({
    position: { set: vi.fn(), copy: vi.fn() },
    scale: { set: vi.fn(), setScalar: vi.fn() },
    userData: {},
    dispose: vi.fn(),
    material: {}
  })),
  Raycaster: vi.fn(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => []),
    ray: {
      origin: { clone: vi.fn(() => ({ add: vi.fn() })) },
      direction: { clone: vi.fn(() => ({ multiplyScalar: vi.fn() })) }
    }
  })),
  Vector2: vi.fn(() => ({ x: 0, y: 0 })),
  Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0, set: vi.fn(), copy: vi.fn() })),
  Color: vi.fn(() => ({})),
  PCFSoftShadowMap: 'PCFSoftShadowMap',
  sRGBEncoding: 'sRGBEncoding',
  ACESFilmicToneMapping: 'ACESFilmicToneMapping'
}))

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createBuffer: vi.fn(),
    createBufferSource: vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      buffer: null
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { value: 1 }
    })),
    destination: {},
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }))
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: vi.fn((callback) => setTimeout(callback, 16))
})

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: vi.fn()
})

// Mock performance
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10, // 10MB
      totalJSHeapSize: 1024 * 1024 * 50, // 50MB
      jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
    }
  }
})

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Array(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn()
})) as any

// Mock DOM elements
document.getElementById = vi.fn((id: string) => {
  const element = document.createElement('div')
  element.id = id
  return element
})