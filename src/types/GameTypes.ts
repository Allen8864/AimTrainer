// Game state constants
export const GameState = {
  MENU: 'menu',
  WAITING_TO_START: 'waiting_to_start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended'
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

// Score data interface
export interface ScoreData {
  totalScore: number;
  hits: number;
  misses: number;
  accuracy: number;
  sessionTime: number;
  bestStreak: number;
  currentStreak: number;
}

// Settings data interface
export interface SettingsData {
  mouseSensitivity: number; // 0.1 - 5.0
  audioEnabled: boolean;
  masterVolume: number; // 0.0 - 1.0
  targetSize: number; // future expansion
  difficulty: string; // future expansion
  // Performance settings
  qualityLevel: string; // 'low', 'medium', 'high', 'auto'
  autoAdjustQuality: boolean;
  targetFps: number; // 30, 60, 120
}

// Target data interface
export interface TargetData {
  id: string;
  position: { x: number; y: number; z: number };
  size: number;
  spawnTime: number;
  isActive: boolean;
  hitTime: number | null;
}