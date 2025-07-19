export class LoadingScreen {
  private container: HTMLElement;
  private progressBar: HTMLElement;
  private progressText: HTMLElement;
  private statusText: HTMLElement;
  private isVisible: boolean = false;

  constructor() {
    this.createLoadingScreen();
    this.container = document.getElementById('loading-screen')!;
    this.progressBar = document.getElementById('loading-progress-bar')!;
    this.progressText = document.getElementById('loading-progress-text')!;
    this.statusText = document.getElementById('loading-status')!;
  }

  private createLoadingScreen(): void {
    // Check if loading screen already exists
    if (document.getElementById('loading-screen')) {
      return;
    }

    const loadingHTML = `
      <div id="loading-screen" class="loading-screen hidden">
        <div class="loading-container">
          <div class="loading-logo">
            <div class="crosshair">
              <div class="crosshair-line horizontal"></div>
              <div class="crosshair-line vertical"></div>
              <div class="crosshair-center"></div>
            </div>
          </div>
          <h2 class="loading-title">3D Aim Trainer</h2>
          <div class="loading-progress">
            <div class="loading-progress-track">
              <div id="loading-progress-bar" class="loading-progress-bar"></div>
            </div>
            <div id="loading-progress-text" class="loading-progress-text">0%</div>
          </div>
          <div id="loading-status" class="loading-status">Initializing...</div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', loadingHTML);

    // Add CSS styles
    this.addLoadingStyles();
  }

  private addLoadingStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .loading-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        transition: opacity 0.5s ease-out;
      }

      .loading-screen.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .loading-container {
        text-align: center;
        color: white;
        max-width: 400px;
        padding: 2rem;
      }

      .loading-logo {
        margin-bottom: 2rem;
        display: flex;
        justify-content: center;
      }

      .crosshair {
        position: relative;
        width: 80px;
        height: 80px;
        animation: pulse 2s ease-in-out infinite;
      }

      .crosshair-line {
        position: absolute;
        background: #ff6600;
        border-radius: 2px;
      }

      .crosshair-line.horizontal {
        width: 60px;
        height: 4px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      .crosshair-line.vertical {
        width: 4px;
        height: 60px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      .crosshair-center {
        position: absolute;
        width: 8px;
        height: 8px;
        background: #ff6600;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }

      .loading-title {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 2rem;
        color: #ff6600;
        text-shadow: 0 0 10px rgba(255, 102, 0, 0.3);
      }

      .loading-progress {
        margin-bottom: 1.5rem;
      }

      .loading-progress-track {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.5rem;
      }

      .loading-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #ff6600, #ffaa00);
        border-radius: 4px;
        width: 0%;
        transition: width 0.3s ease;
        box-shadow: 0 0 10px rgba(255, 102, 0, 0.5);
      }

      .loading-progress-text {
        font-size: 1.2rem;
        font-weight: bold;
        color: #ff6600;
      }

      .loading-status {
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.8);
        min-height: 1.5rem;
      }

      @media (max-width: 768px) {
        .loading-container {
          padding: 1rem;
        }
        
        .loading-title {
          font-size: 1.5rem;
        }
        
        .crosshair {
          width: 60px;
          height: 60px;
        }
        
        .crosshair-line.horizontal {
          width: 45px;
        }
        
        .crosshair-line.vertical {
          height: 45px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  show(): void {
    if (this.container) {
      this.container.classList.remove('hidden');
      this.isVisible = true;
    }
  }

  hide(): void {
    if (this.container) {
      this.container.classList.add('hidden');
      this.isVisible = false;
    }
  }

  setProgress(percentage: number): void {
    if (this.progressBar && this.progressText) {
      const clampedPercentage = Math.max(0, Math.min(100, percentage));
      this.progressBar.style.width = `${clampedPercentage}%`;
      this.progressText.textContent = `${Math.round(clampedPercentage)}%`;
    }
  }

  setStatus(status: string): void {
    if (this.statusText) {
      this.statusText.textContent = status;
    }
  }

  async simulateLoading(steps: Array<{ name: string; duration: number }>): Promise<void> {
    this.show();
    
    let totalProgress = 0;
    const totalSteps = steps.length;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      this.setStatus(step.name);
      
      // Animate progress for this step
      const stepProgress = 100 / totalSteps;
      const startProgress = totalProgress;
      const endProgress = totalProgress + stepProgress;
      
      await this.animateProgress(startProgress, endProgress, step.duration);
      totalProgress = endProgress;
    }
    
    // Final completion
    this.setProgress(100);
    this.setStatus('Ready!');
    
    // Wait a moment before hiding
    await new Promise(resolve => setTimeout(resolve, 500));
    this.hide();
  }

  private async animateProgress(start: number, end: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easedProgress = this.easeOutCubic(progress);
        const currentProgress = start + (end - start) * easedProgress;
        
        this.setProgress(currentProgress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  isShowing(): boolean {
    return this.isVisible;
  }

  dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}