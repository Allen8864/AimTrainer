import { Renderer } from './Renderer';
import { TargetManager } from '../targets/TargetManager';
import { InputManager } from '../managers/InputManager';
import type { MousePosition, MouseMovement } from '../managers/InputManager';
import { SettingsManager } from '../managers/SettingsManager';
import { ScoreManager } from '../managers/ScoreManager';
import { AudioManager } from '../managers/AudioManager';
import { PerformanceManager } from '../managers/PerformanceManager';
import type { QualitySettings } from '../managers/PerformanceManager';
import { AssetManager } from '../managers/AssetManager';
import { SettingsUI } from '../ui/SettingsUI';
import { StatsUI } from '../ui/StatsUI';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ParticleSystem } from '../effects/ParticleSystem';
import { GameState } from '../types/GameTypes';
import type { GameState as GameStateType } from '../types/GameTypes';

export class GameEngine {
  private renderer: Renderer | null = null;
  private targetManager: TargetManager | null = null;
  private inputManager: InputManager | null = null;
  private settingsManager: SettingsManager | null = null;
  private scoreManager: ScoreManager | null = null;
  private audioManager: AudioManager | null = null;
  private performanceManager: PerformanceManager | null = null;
  private assetManager: AssetManager | null = null;
  private settingsUI: SettingsUI | null = null;
  private statsUI: StatsUI | null = null;
  private loadingScreen: LoadingScreen | null = null;
  private particleSystem: ParticleSystem | null = null;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private currentState: GameStateType = GameState.MENU;
  private gameTimer: number = 30; // 30 seconds game timer
  private gameTimerInterval: number | null = null;
  private countdownElement: HTMLElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Initialize loading screen first
      this.loadingScreen = new LoadingScreen();

      // Show loading screen with initialization steps
      await this.loadingScreen.simulateLoading([
        { name: 'Initializing settings...', duration: 200 },
        { name: 'Loading audio system...', duration: 300 },
        { name: 'Preparing 3D renderer...', duration: 400 },
        { name: 'Setting up game systems...', duration: 300 },
        { name: 'Optimizing performance...', duration: 200 }
      ]);

      // Initialize settings manager first
      this.settingsManager = new SettingsManager();

      // Initialize audio manager
      this.audioManager = new AudioManager(this.settingsManager);
      this.audioManager.initialize().catch(() => {
        // Audio initialization failed - continue without audio
      });

      // Initialize asset manager with audio context
      const audioContext = this.audioManager.getAudioContext();
      this.assetManager = new AssetManager(audioContext || undefined);

      // Initialize score manager
      this.scoreManager = new ScoreManager();

      // Initialize input manager with settings
      this.inputManager = new InputManager(this.canvas, this.settingsManager);

      // Initialize renderer and target manager
      this.renderer = new Renderer(this.canvas);
      this.targetManager = new TargetManager(this.renderer.getScene(), this.renderer.getCamera());

      // Initialize particle system
      this.particleSystem = new ParticleSystem(this.renderer.getScene());

      // Initialize performance manager
      this.performanceManager = new PerformanceManager();
      this.performanceManager.initialize(this.renderer.getRenderer());
      this.performanceManager.onQualityChanged((settings: QualitySettings) => {
        this.handleQualityChange(settings);
      });

      // Apply initial performance settings from SettingsManager
      this.applyPerformanceSettings();

      // Initialize settings UI
      this.settingsUI = new SettingsUI(this.settingsManager);

      // Connect settings UI with audio manager
      if (this.audioManager) {
        this.settingsUI.setAudioManager(this.audioManager);
      }

      // Initialize stats UI
      this.statsUI = new StatsUI();

      this.setupEventListeners();
      this.start();
    } catch (error) {
      // Error handling is already done in Renderer constructor
    }
  }

  private setupEventListeners(): void {
    // Set up input manager click handler
    if (this.inputManager) {
      this.inputManager.onMouseClick(this.handleClick.bind(this));

      // Set up camera control for first-person view
      this.inputManager.onCameraControl(this.handleCameraControl.bind(this));
    }

    // Get countdown element reference
    this.countdownElement = document.getElementById('countdown-timer');

    // Add settings button if it exists
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton && this.settingsUI) {
      settingsButton.addEventListener('click', () => {
        this.settingsUI!.show();
      });
    }

    // Add pause settings button if it exists
    const pauseSettingsButton = document.getElementById('pause-settings-button');
    if (pauseSettingsButton && this.settingsUI) {
      pauseSettingsButton.addEventListener('click', () => {
        this.settingsUI!.show();
      });
    }

    // Add keyboard event listeners
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Handle fullscreen change events
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));

    // Handle pointer lock change events
    document.addEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));

    // Setup game end screen buttons
    const playAgainBtn = document.getElementById('play-again-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');

    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        this.startGame();
      });
    }

    if (backToMenuBtn) {
      backToMenuBtn.addEventListener('click', () => {
        this.returnToMenu();
      });
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Escape':
        if (this.currentState === GameState.PLAYING) {
          this.pauseGame();
        } else if (this.currentState === GameState.PAUSED) {
          this.returnToMenu();
        }
        break;
      case 'Space':
        if (this.currentState === GameState.PLAYING) {
          // Allow pausing even in fullscreen
          this.pauseGame();
        } else if (this.currentState === GameState.PAUSED && !document.fullscreenElement) {
          // Only allow resuming when not in fullscreen
          this.resumeGame();
        }
        event.preventDefault();
        break;
    }
  }

  private handleFullscreenChange(): void {
    // Force resize when fullscreen state changes
    setTimeout(() => {
      if (this.renderer) {
        this.renderer.handleResize();
      }
    }, 100);

    // If user exits fullscreen manually, pause the game and exit pointer lock
    if (!document.fullscreenElement && this.currentState === GameState.PLAYING) {
      if (this.inputManager) {
        this.inputManager.exitPointerLock();
      }
      this.pauseGame();
    }
  }

  private handlePointerLockChange(): void {
    // If pointer lock is lost during gameplay, pause the game
    if (!document.pointerLockElement && this.currentState === GameState.PLAYING) {
      this.pauseGame();
    }
  }

  private handleCameraControl(movement: MouseMovement): void {
    // Allow camera control during gameplay and waiting to start
    if ((this.currentState !== GameState.PLAYING && this.currentState !== GameState.WAITING_TO_START) || !this.renderer) return;

    // Update camera rotation based on mouse movement
    this.renderer.updateCameraFromMouse(movement.movementX, movement.movementY, movement.sensitivity);
  }

  private handleClick(position: MousePosition): void {
    // Handle click in waiting state to start the game
    if (this.currentState === GameState.WAITING_TO_START) {
      this.actuallyStartGame();
      return;
    }

    if (!this.targetManager || !this.scoreManager || this.currentState !== GameState.PLAYING) return;

    // Trigger weapon firing animation
    if (this.renderer) {
      this.renderer.fireWeapon();

      // Create muzzle flash particle effect
      if (this.particleSystem) {
        const weapon = this.renderer.getUSPPistol();
        if (weapon) {
          const muzzlePosition = weapon.getMuzzlePosition();
          const direction = weapon.getMuzzleDirection();
          this.particleSystem.createMuzzleFlash(muzzlePosition, direction);
        }
      }
    }

    // Play gunshot sound
    if (this.audioManager) {
      this.audioManager.playSound('gunshot');
    }

    // Determine hit position based on pointer lock state
    let hitX: number, hitY: number;
    if (this.inputManager && this.inputManager.isPointerLockActive()) {
      // In pointer lock mode, use screen center (crosshair position)
      hitX = this.canvas.clientWidth / 2;
      hitY = this.canvas.clientHeight / 2;
    } else {
      // In normal mode, use mouse position
      hitX = position.x;
      hitY = position.y;
    }

    // Use the determined coordinates for hit detection
    const result = this.targetManager.checkHit(
      hitX,
      hitY,
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );

    if (result.hit) {
      // Calculate reaction time if target has spawn time
      const reactionTime = result.target ? this.calculateReactionTime(result.target) : undefined;

      // Add hit to score manager
      this.scoreManager.addHit(reactionTime);

      // Create hit particle effect
      if (this.particleSystem && result.hitPoint) {
        this.particleSystem.createHitEffect(result.hitPoint);
      }

      // Play hit sound
      if (this.audioManager) {
        this.audioManager.playSound('hit');
      }

      // Check for milestone achievements
      const currentStreak = this.scoreManager.getStatistics().currentStreak;
      if (currentStreak > 0 && currentStreak % 10 === 0) {
        // Create explosion effect for milestones
        if (this.particleSystem && result.hitPoint) {
          this.particleSystem.createExplosionEffect(result.hitPoint, 1.5);
        }

        // Play milestone sound for every 10 hits in a row
        if (this.audioManager) {
          setTimeout(() => this.audioManager!.playSound('milestone'), 100);
        }
      }
    } else {
      // Add miss to score manager
      this.scoreManager.addMiss();

      // Create miss particle effect
      if (this.particleSystem && result.hitPoint) {
        this.particleSystem.createMissEffect(result.hitPoint);
      }

      // Play miss sound
      if (this.audioManager) {
        this.audioManager.playSound('miss');
      }
    }
  }

  private calculateReactionTime(target: any): number {
    // Calculate actual reaction time based on target spawn time
    const targetData = target.getData();
    const currentTime = Date.now();
    return currentTime - targetData.spawnTime;
  }

  public start(): void {
    if (!this.renderer) return;

    this.isRunning = true;
    this.gameLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop(currentTime: number = 0): void {
    if (!this.isRunning || !this.renderer) return;

    // Update performance manager
    if (this.performanceManager) {
      this.performanceManager.update(currentTime);

      // Check for memory management needs every 5 seconds
      if (Math.floor(currentTime / 5000) !== Math.floor(this.lastTime / 5000)) {
        this.checkMemoryUsage();
      }
    }

    // Calculate delta time
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update game systems based on state
    if (this.currentState === GameState.PLAYING) {
      // Update target system
      if (this.targetManager) {
        this.targetManager.updateTargets(deltaTime);
      }

      // Update particle system
      if (this.particleSystem) {
        this.particleSystem.update(deltaTime / 1000); // Convert to seconds
      }

      // Update score display with remaining time
      this.updateScoreDisplay();
    } else if (this.currentState === GameState.WAITING_TO_START) {
      // In waiting state, still update particle system for visual effects
      if (this.particleSystem) {
        this.particleSystem.update(deltaTime / 1000);
      }

      // Update countdown display but don't start timer yet
      this.updateCountdownDisplay();

      // Update score display to show 0s for time
      this.updateScoreDisplay();
    } else if (this.currentState === GameState.PAUSED) {
      // In paused state, update score display to show remaining time
      this.updateScoreDisplay();
    }

    // Always render the scene
    this.renderer.render();

    // Continue the loop
    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  private updateScoreDisplay(): void {
    if (!this.scoreManager) return;

    const scoreElement = document.getElementById('score');
    const accuracyElement = document.getElementById('accuracy');
    const timeElement = document.getElementById('time');

    if (scoreElement) {
      scoreElement.textContent = `Score: ${this.scoreManager.getScore()}`;
    }

    if (accuracyElement) {
      accuracyElement.textContent = `Accuracy: ${this.scoreManager.getAccuracy().toFixed(1)}%`;
    }

    if (timeElement) {
      // Show remaining time during gameplay and paused state, 0s during waiting
      if (this.currentState === GameState.PLAYING || this.currentState === GameState.PAUSED) {
        timeElement.textContent = `Time: ${this.gameTimer}s`;
      } else {
        timeElement.textContent = `Time: 0s`;
      }
    }
  }

  public getTargetManager(): TargetManager | null {
    return this.targetManager;
  }

  public getRenderer(): Renderer | null {
    return this.renderer;
  }

  public getScoreManager(): ScoreManager | null {
    return this.scoreManager;
  }

  public getAudioManager(): AudioManager | null {
    return this.audioManager;
  }

  public showStatistics(): void {
    if (this.scoreManager && this.statsUI) {
      if (this.statsUI.isVisible()) {
        // If stats panel is visible, hide it
        this.statsUI.hide();
      } else {
        // If stats panel is hidden, show it
        const stats = this.scoreManager.getStatistics();
        this.statsUI.show(stats);
      }
    }
  }

  public startNewSession(): void {
    if (this.scoreManager) {
      this.scoreManager.reset();
    }
    if (this.targetManager) {
      this.targetManager.reset();
    }
  }

  // Game State Management Methods
  public getCurrentState(): GameStateType {
    return this.currentState;
  }

  public startGame(): void {
    if (this.currentState === GameState.MENU || this.currentState === GameState.ENDED) {
      this.currentState = GameState.WAITING_TO_START;

      // Reset game timer
      this.gameTimer = 30;
      this.updateCountdownDisplay();

      // Reset game state for new session
      this.startNewSession();

      // Enter fullscreen and setup game mode
      this.enterGameMode();

      // Update UI visibility
      this.updateUIVisibility();
    }
  }

  private actuallyStartGame(): void {
    if (this.currentState === GameState.WAITING_TO_START) {
      this.currentState = GameState.PLAYING;

      // Check if we need to re-enter fullscreen mode
      if (!document.fullscreenElement) {
        this.enterGameMode();
      }

      // Start the game timer
      this.startGameTimer();

      // Start spawning targets
      if (this.targetManager) {
        this.targetManager.startSpawning();
      }

      // Update UI visibility
      this.updateUIVisibility();
    }
  }

  public pauseGame(): void {
    if (this.currentState === GameState.PLAYING) {
      this.currentState = GameState.PAUSED;

      // Stop the game timer
      this.stopGameTimer();

      // Temporarily exit game mode for pause menu
      this.exitGameMode();

      this.updateUIVisibility();
    }
  }

  public resumeGame(): void {
    if (this.currentState === GameState.PAUSED) {
      this.currentState = GameState.PLAYING;

      // Resume the game timer
      this.startGameTimer();

      // Re-enter game mode
      this.enterGameMode();

      this.updateUIVisibility();
    }
  }

  public endGame(): void {
    if (this.currentState === GameState.PLAYING || this.currentState === GameState.PAUSED) {
      this.currentState = GameState.ENDED;

      // Stop the game timer
      this.stopGameTimer();

      // Stop target spawning
      if (this.targetManager) {
        this.targetManager.stopSpawning();
      }

      // Exit game mode
      this.exitGameMode();

      // Show final statistics in the end screen
      this.showFinalStats();

      this.updateUIVisibility();
    }
  }

  private startGameTimer(): void {
    this.gameTimerInterval = window.setInterval(() => {
      this.gameTimer--;
      this.updateCountdownDisplay();

      if (this.gameTimer <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  private stopGameTimer(): void {
    if (this.gameTimerInterval) {
      clearInterval(this.gameTimerInterval);
      this.gameTimerInterval = null;
    }
  }

  private updateCountdownDisplay(): void {
    if (this.countdownElement) {
      this.countdownElement.textContent = `${this.gameTimer}s`;
    }
  }

  private showFinalStats(): void {
    const finalStatsElement = document.getElementById('final-stats');
    if (!finalStatsElement || !this.scoreManager) return;

    const stats = this.scoreManager.getStatistics();
    const totalShots = stats.hits + stats.misses;

    const finalStatsHTML = `
      <div class="stat-item">
        <span class="stat-label">Final Score:</span>
        <span class="stat-value">${stats.totalScore.toLocaleString()}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Targets Hit:</span>
        <span class="stat-value">${stats.hits}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Shots:</span>
        <span class="stat-value">${totalShots}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Accuracy:</span>
        <span class="stat-value">${stats.accuracy.toFixed(1)}%</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Best Streak:</span>
        <span class="stat-value">${stats.bestStreak}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Game Duration:</span>
        <span class="stat-value">30s</span>
      </div>
    `;

    finalStatsElement.innerHTML = finalStatsHTML;
  }

  public returnToMenu(): void {
    this.currentState = GameState.MENU;

    // Stop the game timer
    this.stopGameTimer();

    // Reset game timer
    this.gameTimer = 30;

    // Exit game mode
    this.exitGameMode();

    this.updateUIVisibility();

    // Reset game state
    this.startNewSession();
  }

  private enterGameMode(): void {
    // Request fullscreen
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().then(() => {
        // Force resize after entering fullscreen
        setTimeout(() => {
          if (this.renderer) {
            this.renderer.handleResize();
          }
        }, 100);

        // Request pointer lock after fullscreen is active
        this.requestPointerLock();
      }).catch(() => {
        // Try pointer lock anyway
        this.requestPointerLock();
      });
    } else {
      // No fullscreen support, just request pointer lock
      this.requestPointerLock();
    }

    // Show game crosshair
    const gameCrosshair = document.getElementById('game-crosshair');
    if (gameCrosshair) {
      gameCrosshair.classList.remove('hidden');
    }
  }

  private requestPointerLock(): void {
    if (this.inputManager) {
      this.inputManager.requestPointerLock().then(() => {
        document.body.classList.add('game-active');
      }).catch(() => {
        // Fallback to hiding cursor
        document.body.classList.add('game-active');
      });
    }
  }

  private exitGameMode(): void {
    // Exit pointer lock first
    if (this.inputManager) {
      this.inputManager.exitPointerLock();
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // Ignore fullscreen exit errors
      });
    }

    // Show cursor and hide crosshair
    document.body.classList.remove('game-active');

    // Hide game crosshair
    const gameCrosshair = document.getElementById('game-crosshair');
    if (gameCrosshair) {
      gameCrosshair.classList.add('hidden');
    }
  }

  private updateUIVisibility(): void {
    const startScreen = document.getElementById('start-screen');
    const gameUI = document.getElementById('game-ui');
    const pauseOverlay = document.getElementById('pause-overlay');
    const waitingPrompt = document.getElementById('waiting-prompt');
    const gameEndScreen = document.getElementById('game-end-screen');
    const startButton = document.getElementById('start-button');

    if (!startScreen || !gameUI) return;

    // Hide all screens first
    startScreen.classList.add('hidden');
    gameUI.classList.add('hidden');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    if (waitingPrompt) waitingPrompt.classList.add('hidden');
    if (gameEndScreen) gameEndScreen.classList.add('hidden');

    // Show appropriate screen based on current state
    switch (this.currentState) {
      case GameState.MENU:
        startScreen.classList.remove('hidden');
        if (startButton) startButton.textContent = 'Play Now';
        break;
      case GameState.WAITING_TO_START:
        gameUI.classList.remove('hidden');
        if (waitingPrompt) waitingPrompt.classList.remove('hidden');
        break;
      case GameState.PLAYING:
        gameUI.classList.remove('hidden');
        break;
      case GameState.PAUSED:
        gameUI.classList.remove('hidden');
        if (pauseOverlay) pauseOverlay.classList.remove('hidden');
        break;
      case GameState.ENDED:
        if (gameEndScreen) gameEndScreen.classList.remove('hidden');
        break;
    }
  }

  private applyPerformanceSettings(): void {
    if (!this.performanceManager || !this.settingsManager) return;

    // Apply settings from SettingsManager to PerformanceManager
    const qualityLevel = this.settingsManager.getSetting('qualityLevel');
    const autoAdjust = this.settingsManager.getSetting('autoAdjustQuality');
    const targetFps = this.settingsManager.getSetting('targetFps');

    // Set quality level if not auto
    if (qualityLevel !== 'auto') {
      this.performanceManager.setQualityLevel(qualityLevel as any);
    }

    // Set auto-adjust preference
    this.performanceManager.setAutoAdjust(autoAdjust);

    // Set target FPS
    this.performanceManager.setTargetFps(targetFps);
  }

  private handleQualityChange(settings: QualitySettings): void {
    // Apply quality settings to renderer
    if (this.renderer) {
      this.renderer.applyQualitySettings(settings);
    }

    // Apply quality settings to target manager
    if (this.targetManager) {
      this.targetManager.setMaxPoolSize(Math.floor(settings.particleCount / 2));
      // Adjust target complexity based on quality
      if (settings.targetComplexity < 16) {
        // Low quality - simpler targets
        this.targetManager.setTargetComplexity(8);
      } else if (settings.targetComplexity < 24) {
        // Medium quality
        this.targetManager.setTargetComplexity(16);
      } else {
        // High quality
        this.targetManager.setTargetComplexity(32);
      }
    }

    // Apply quality settings to particle system
    if (this.particleSystem) {
      this.particleSystem.setMaxParticles(settings.particleCount);
    }
  }

  private checkMemoryUsage(): void {
    if (!this.assetManager || !this.performanceManager) return;

    const memoryUsage = this.assetManager.getMemoryUsage();
    const totalMemoryMB = memoryUsage.total / (1024 * 1024);

    // Check if memory usage is high (over 100MB)
    if (totalMemoryMB > 100) {
      // Trigger asset cleanup
      this.assetManager.clearUnusedAssets();

      // If still high, optimize for low memory
      if (totalMemoryMB > 150) {
        this.assetManager.optimizeForLowMemory();
      }
    }

    // Check browser memory if available
    const browserMemory = (performance as any).memory;
    if (browserMemory) {
      const usedMemoryMB = browserMemory.usedJSHeapSize / (1024 * 1024);
      const limitMemoryMB = browserMemory.jsHeapSizeLimit / (1024 * 1024);

      // If using more than 80% of available memory, trigger cleanup
      if (usedMemoryMB / limitMemoryMB > 0.8) {
        this.assetManager.clearUnusedAssets();

        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
      }
    }
  }

  public getPerformanceManager(): PerformanceManager | null {
    return this.performanceManager;
  }

  public getAssetManager(): AssetManager | null {
    return this.assetManager;
  }

  public dispose(): void {
    this.stop();

    // Stop the game timer
    this.stopGameTimer();

    // Exit game mode if active
    this.exitGameMode();

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));

    // Dispose of particle system
    if (this.particleSystem) {
      this.particleSystem.dispose();
      this.particleSystem = null;
    }

    // Dispose of loading screen
    if (this.loadingScreen) {
      this.loadingScreen.dispose();
      this.loadingScreen = null;
    }

    // Dispose of performance manager
    if (this.performanceManager) {
      this.performanceManager.dispose();
      this.performanceManager = null;
    }

    // Dispose of asset manager
    if (this.assetManager) {
      this.assetManager.dispose();
      this.assetManager = null;
    }

    // Dispose of input manager
    if (this.inputManager) {
      this.inputManager.dispose();
      this.inputManager = null;
    }

    // Dispose of target manager
    if (this.targetManager) {
      this.targetManager.dispose();
      this.targetManager = null;
    }

    // Dispose of renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Dispose of audio manager
    if (this.audioManager) {
      this.audioManager.dispose();
      this.audioManager = null;
    }

    // Clean up UI components and managers
    if (this.statsUI) {
      this.statsUI.dispose();
      this.statsUI = null;
    }
    this.settingsUI = null;
    this.settingsManager = null;
    this.scoreManager = null;
  }
}