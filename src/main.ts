import './style.css'
import { GameEngine } from './core/GameEngine'

let gameEngine: GameEngine | null = null;

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const startButton = document.getElementById('start-button');

  if (!canvas) {
    return;
  }

  // Initialize game engine with canvas
  gameEngine = new GameEngine(canvas);

  // Handle start button click
  if (startButton) {
    startButton.addEventListener('click', () => {
      if (gameEngine) {
        gameEngine.startGame();
      }
    });
  }

  // Handle pause overlay buttons
  const resumeButton = document.getElementById('resume-button');
  const menuButton = document.getElementById('menu-button');

  if (resumeButton) {
    resumeButton.addEventListener('click', () => {
      if (gameEngine) {
        gameEngine.resumeGame();
      }
    });
  }

  if (menuButton) {
    menuButton.addEventListener('click', () => {
      if (gameEngine) {
        gameEngine.returnToMenu();
      }
    });
  }

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (!gameEngine) return;

    switch (e.key) {
      case 'Tab':
        // Show statistics only when not in fullscreen
        e.preventDefault();
        if (!document.fullscreenElement) {
          gameEngine.showStatistics();
        }
        break;
    }
  });
});
