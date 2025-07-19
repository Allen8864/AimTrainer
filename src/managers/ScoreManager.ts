import type { ScoreData } from '../types/GameTypes';

export class ScoreManager {
  private scoreData: ScoreData;
  private sessionStartTime: number;
  private lastHitTime: number = 0;
  private scoreMultiplier: number = 100;
  private timeBonusThreshold: number = 1000; // 1 second for time bonus
  private maxTimeBonus: number = 50;

  // UI elements
  private scoreElement: HTMLElement | null = null;
  private accuracyElement: HTMLElement | null = null;
  private timeElement: HTMLElement | null = null;

  constructor() {
    this.scoreData = {
      totalScore: 0,
      hits: 0,
      misses: 0,
      accuracy: 0,
      sessionTime: 0,
      bestStreak: 0,
      currentStreak: 0
    };
    
    this.sessionStartTime = Date.now();
    this.initializeUI();
  }

  private initializeUI(): void {
    this.scoreElement = document.getElementById('score');
    this.accuracyElement = document.getElementById('accuracy');
    this.timeElement = document.getElementById('time');
    
    // Start the UI update loop
    this.updateUI();
    this.startUIUpdateLoop();
  }

  private startUIUpdateLoop(): void {
    const updateLoop = () => {
      this.updateSessionTime();
      this.updateUI();
      requestAnimationFrame(updateLoop);
    };
    requestAnimationFrame(updateLoop);
  }

  private updateSessionTime(): void {
    this.scoreData.sessionTime = Date.now() - this.sessionStartTime;
  }

  public addHit(reactionTime?: number): number {
    this.scoreData.hits++;
    this.scoreData.currentStreak++;
    
    // Update best streak
    if (this.scoreData.currentStreak > this.scoreData.bestStreak) {
      this.scoreData.bestStreak = this.scoreData.currentStreak;
    }

    // Calculate base score
    let hitScore = this.scoreMultiplier;

    // Add time bonus if reaction was fast
    if (reactionTime && reactionTime < this.timeBonusThreshold) {
      const timeBonusRatio = 1 - (reactionTime / this.timeBonusThreshold);
      const timeBonus = Math.floor(this.maxTimeBonus * timeBonusRatio);
      hitScore += timeBonus;
    }

    // Add streak bonus
    const streakBonus = Math.floor(this.scoreData.currentStreak * 10);
    hitScore += streakBonus;

    this.scoreData.totalScore += hitScore;
    this.updateAccuracy();
    this.lastHitTime = Date.now();

    return hitScore;
  }

  public addMiss(): void {
    this.scoreData.misses++;
    this.scoreData.currentStreak = 0; // Reset streak on miss
    this.updateAccuracy();
  }

  private updateAccuracy(): void {
    const totalShots = this.scoreData.hits + this.scoreData.misses;
    this.scoreData.accuracy = totalShots > 0 ? (this.scoreData.hits / totalShots) * 100 : 0;
  }

  public getScore(): number {
    return this.scoreData.totalScore;
  }

  public getAccuracy(): number {
    return this.scoreData.accuracy;
  }

  public getHits(): number {
    return this.scoreData.hits;
  }

  public getMisses(): number {
    return this.scoreData.misses;
  }

  public getCurrentStreak(): number {
    return this.scoreData.currentStreak;
  }

  public getBestStreak(): number {
    return this.scoreData.bestStreak;
  }

  public getSessionTime(): number {
    return this.scoreData.sessionTime;
  }

  public getStatistics(): ScoreData {
    this.updateSessionTime();
    return { ...this.scoreData };
  }

  public reset(): void {
    this.scoreData = {
      totalScore: 0,
      hits: 0,
      misses: 0,
      accuracy: 0,
      sessionTime: 0,
      bestStreak: 0,
      currentStreak: 0
    };
    
    this.sessionStartTime = Date.now();
    this.lastHitTime = 0;
    this.updateUI();
  }

  private updateUI(): void {
    if (this.scoreElement) {
      this.scoreElement.textContent = `Score: ${this.scoreData.totalScore.toLocaleString()}`;
    }
    
    if (this.accuracyElement) {
      this.accuracyElement.textContent = `Accuracy: ${this.scoreData.accuracy.toFixed(1)}%`;
    }
    
    if (this.timeElement) {
      const seconds = Math.floor(this.scoreData.sessionTime / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const timeString = minutes > 0 
        ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
        : `${seconds}s`;
      this.timeElement.textContent = `Time: ${timeString}`;
    }
  }

  public showEndGameStatistics(): string {
    this.updateSessionTime();
    
    const totalShots = this.scoreData.hits + this.scoreData.misses;
    const sessionMinutes = Math.floor(this.scoreData.sessionTime / 60000);
    const sessionSeconds = Math.floor((this.scoreData.sessionTime % 60000) / 1000);
    
    const stats = [
      `Final Score: ${this.scoreData.totalScore.toLocaleString()}`,
      `Targets Hit: ${this.scoreData.hits}`,
      `Total Shots: ${totalShots}`,
      `Accuracy: ${this.scoreData.accuracy.toFixed(1)}%`,
      `Best Streak: ${this.scoreData.bestStreak}`,
      `Session Time: ${sessionMinutes}:${sessionSeconds.toString().padStart(2, '0')}`
    ];

    return stats.join('\n');
  }

  public getReactionTime(): number {
    return this.lastHitTime > 0 ? Date.now() - this.lastHitTime : 0;
  }
}