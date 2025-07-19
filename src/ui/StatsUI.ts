import type { ScoreData } from '../types/GameTypes';

export class StatsUI {
  private modal: HTMLElement | null = null;
  private statsContent: HTMLElement | null = null;
  private closeStatsBtn: HTMLElement | null = null;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
  }

  private initializeElements(): void {
    this.modal = document.getElementById('stats-modal');
    this.statsContent = document.getElementById('stats-content');
    this.closeStatsBtn = document.getElementById('close-stats-btn');
  }

  private setupEventListeners(): void {
    if (this.closeStatsBtn) {
      this.closeStatsBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // Close modal when clicking outside content
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.hide();
        }
      });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.hide();
      }
    });
  }

  public show(scoreData: ScoreData): void {
    if (!this.modal || !this.statsContent) return;

    this.populateStats(scoreData);
    this.modal.classList.remove('hidden');
  }

  public hide(): void {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
  }

  public isVisible(): boolean {
    return this.modal ? !this.modal.classList.contains('hidden') : false;
  }

  private populateStats(scoreData: ScoreData): void {
    if (!this.statsContent) return;

    const totalShots = scoreData.hits + scoreData.misses;
    const sessionMinutes = Math.floor(scoreData.sessionTime / 60000);
    const sessionSeconds = Math.floor((scoreData.sessionTime % 60000) / 1000);
    const timeString = sessionMinutes > 0 
      ? `${sessionMinutes}:${sessionSeconds.toString().padStart(2, '0')}`
      : `${sessionSeconds}s`;

    // Calculate additional stats
    const shotsPerMinute = sessionMinutes > 0 ? 
      Math.round(totalShots / sessionMinutes) : totalShots;

    const statsHTML = `
      <div class="stat-item">
        <span class="stat-label">Final Score:</span>
        <span class="stat-value">${scoreData.totalScore.toLocaleString()}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Targets Hit:</span>
        <span class="stat-value">${scoreData.hits}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Shots:</span>
        <span class="stat-value">${totalShots}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Accuracy:</span>
        <span class="stat-value">${scoreData.accuracy.toFixed(1)}%</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Best Streak:</span>
        <span class="stat-value">${scoreData.bestStreak}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Session Time:</span>
        <span class="stat-value">${timeString}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Shots per Minute:</span>
        <span class="stat-value">${shotsPerMinute}</span>
      </div>
    `;

    this.statsContent.innerHTML = statsHTML;
  }

  public dispose(): void {
    // Clean up event listeners if needed
  }
}