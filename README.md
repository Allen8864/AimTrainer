# 🎯 3D Aim Trainer

A high-performance, browser-based 3D aim trainer built with Three.js and TypeScript. Practice your aiming skills in a realistic 3D environment with USP pistol mechanics, advanced scoring system, and performance optimization.

![3D Aim Trainer](https://img.shields.io/badge/3D-Aim%20Trainer-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

## ✨ Features

### 🎮 Core Gameplay
- **Realistic 3D Environment**: Immersive training facility with proper lighting and shadows
- **USP Pistol Mechanics**: Authentic weapon handling with recoil, muzzle flash, and shell ejection
- **Dynamic Target System**: Smart target spawning with view-based positioning
- **Advanced Scoring**: Score calculation based on accuracy, reaction time, and streak bonuses
- **Performance Tracking**: Real-time statistics with accuracy, hits, misses, and session time

### 🎨 Visual Effects
- **Particle System**: Muzzle flash, hit effects, miss indicators, and explosion effects
- **Realistic Lighting**: Multiple light sources for optimal target visibility
- **Smooth Animations**: Weapon recoil, target animations, and UI transitions
- **Responsive Design**: Adaptive interface for different screen sizes

### 🔧 Technical Features
- **Performance Optimization**: Automatic quality adjustment based on device capabilities
- **Memory Management**: Efficient asset loading and cleanup
- **Audio System**: Spatial audio with gunshot, hit, miss, and milestone sounds
- **Settings Management**: Customizable mouse sensitivity, audio controls, and quality settings
- **Fullscreen Support**: Immersive gameplay with pointer lock controls

### 🎯 Game Modes
- **Timed Sessions**: 30-second training rounds
- **Continuous Play**: Practice mode with unlimited time
- **Statistics Tracking**: Detailed performance analytics
- **Pause/Resume**: Flexible session management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Modern web browser with WebGL support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd aimtrainer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run type-check       # TypeScript type checking

# Building
npm run build           # Production build
npm run build:clean     # Clean build
npm run build:verify    # Build with verification
npm run preview         # Preview production build

# Testing
npm run test            # Run tests
npm run test:watch      # Watch mode testing
npm run test:ui         # Test UI interface

# Utilities
npm run verify-build    # Verify build output
npm run clean          # Clean dist folder
```

## 🎮 How to Play

### Getting Started
1. **Launch**: Open the application in your browser
2. **Start**: Click "Play Now" to begin
3. **Aim**: Move your mouse to aim at targets
4. **Shoot**: Click to fire the USP pistol
5. **Score**: Hit targets to increase your score and accuracy

### Controls
- **Mouse**: Aim and look around
- **Left Click**: Fire weapon
- **Space**: Pause/Resume game
- **Tab**: View statistics (when not in fullscreen)
- **Esc**: Exit fullscreen/Return to menu

### Game Mechanics
- **Scoring**: Base score + time bonus + streak multiplier
- **Accuracy**: Percentage of shots that hit targets
- **Streaks**: Consecutive hits increase score multiplier
- **Reaction Time**: Faster reactions earn bonus points
- **Target Spawning**: 70% in view, 30% random positioning

## 🏗️ Architecture

### Project Structure
```
src/
├── core/                 # Core game systems
│   ├── GameEngine.ts    # Main game loop and state management
│   └── Renderer.ts      # 3D rendering and scene management
├── managers/            # System managers
│   ├── AudioManager.ts  # Audio system and sound effects
│   ├── InputManager.ts  # Mouse/keyboard input handling
│   ├── ScoreManager.ts  # Scoring and statistics
│   ├── SettingsManager.ts # User preferences
│   ├── AssetManager.ts  # Asset loading and caching
│   └── PerformanceManager.ts # Performance optimization
├── targets/             # Target system
│   ├── Target.ts        # Individual target logic
│   ├── TargetManager.ts # Target spawning and management
│   └── TargetPool.ts    # Object pooling for performance
├── weapons/             # Weapon systems
│   └── USPPistol.ts     # USP pistol implementation
├── effects/             # Visual effects
│   └── ParticleSystem.ts # Particle effects system
├── environment/         # 3D environment
│   └── TrainingEnvironment.ts # Training facility
├── ui/                  # User interface
│   ├── SettingsUI.ts    # Settings panel
│   ├── StatsUI.ts       # Statistics display
│   └── LoadingScreen.ts # Loading interface
├── types/               # TypeScript definitions
│   └── GameTypes.ts     # Game-specific types
└── test/                # Test suites
    └── *.test.ts        # Unit tests
```

### Key Systems

#### Game Engine
- **State Management**: Menu, Playing, Paused, Ended states
- **Game Loop**: 60 FPS rendering with delta time calculations
- **System Coordination**: Manages all subsystems and their interactions

#### Rendering System
- **Three.js Integration**: WebGL-based 3D rendering
- **Scene Management**: Optimized scene graph with efficient culling
- **Quality Adaptation**: Dynamic quality adjustment for performance

#### Performance System
- **Automatic Optimization**: FPS monitoring with quality adjustment
- **Memory Management**: Asset cleanup and garbage collection
- **Device Detection**: Hardware capability assessment

## 🔧 Configuration

### Settings
The application supports various customizable settings:

```typescript
interface GameSettings {
  mouseSensitivity: number;    // 0.1 - 5.0
  audioEnabled: boolean;       // Audio on/off
  masterVolume: number;        // 0.0 - 1.0
  qualityLevel: string;        // 'low' | 'medium' | 'high' | 'auto'
  autoAdjustQuality: boolean;  // Automatic quality adjustment
  targetFps: number;           // Target frame rate
}
```

### Performance Tuning
Quality levels automatically adjust:
- **Low**: Reduced particles, shadows disabled, lower resolution
- **Medium**: Balanced settings for mid-range devices
- **High**: Full quality for high-end hardware
- **Auto**: Dynamic adjustment based on performance

## 🚀 Deployment

### Vercel Deployment (Recommended)

The project is optimized for Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Build and deploy
npm run build:verify
vercel --prod
```

### Build Optimization Features
- **Code Splitting**: Separate chunks for optimal caching
- **Asset Optimization**: Compressed textures and models
- **Bundle Analysis**: Size monitoring and optimization
- **Performance Monitoring**: Built-in performance tracking

### Performance Targets
- **Initial Load**: < 3 seconds on 3G
- **Bundle Size**: ~532KB total (gzipped: ~130KB)
- **Frame Rate**: 60 FPS on modern hardware, 30+ FPS on mobile
- **Memory Usage**: < 150MB peak usage

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Core game logic and managers
- **Integration Tests**: System interactions
- **Performance Tests**: Frame rate and memory usage
- **Browser Compatibility**: Cross-browser testing

### Running Tests
```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:ui        # Visual test interface
```

## 🎯 Performance

### Optimization Features
- **Object Pooling**: Reuse targets and particles for efficiency
- **Frustum Culling**: Only render visible objects
- **Level of Detail**: Adaptive quality based on performance
- **Asset Streaming**: Progressive loading of resources
- **Memory Management**: Automatic cleanup of unused assets

### Browser Support
- **Chrome**: 80+ (Recommended)
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

### System Requirements
- **Minimum**: 2GB RAM, integrated graphics
- **Recommended**: 4GB RAM, dedicated graphics
- **WebGL**: Required for 3D rendering

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format

### Areas for Contribution
- **New Game Modes**: Additional training scenarios
- **Weapon Systems**: Different weapon types
- **Visual Effects**: Enhanced particle systems
- **Performance**: Optimization improvements
- **Accessibility**: Better accessibility support

## 📊 Analytics

### Performance Metrics
The application tracks various performance metrics:
- Frame rate and render time
- Memory usage and garbage collection
- Asset loading times
- User interaction patterns

### Game Statistics
- Accuracy percentage over time
- Reaction time improvements
- Score progression
- Session duration and frequency

## 🔒 Security

### Security Features
- **Content Security Policy**: XSS protection
- **HTTPS Only**: Secure connections required
- **No External Dependencies**: Self-contained application
- **Input Validation**: Sanitized user inputs

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js**: 3D graphics library
- **Vite**: Build tool and development server
- **TypeScript**: Type-safe JavaScript
- **Vercel**: Hosting and deployment platform

## 📞 Support

For support, questions, or feedback:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide in [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Ready to improve your aim? Start training now!** 🎯
