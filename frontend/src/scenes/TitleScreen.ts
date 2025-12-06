import Phaser from 'phaser';
import { LevelManager } from '../LevelManager.js';
import * as utils from '../utils';
import { connectWallet, disconnectWallet, getConnectedWallet, shortenAddress, isWalletConnected, autoReconnectWallet } from '../walletUtils';

export class TitleScreen extends Phaser.Scene {
  // UI elements
  uiContainer!: Phaser.GameObjects.DOMElement;
  
  // Input controls - HTML event handlers
  keydownHandler?: (event: KeyboardEvent) => void;
  clickHandler?: (event: Event) => void;
  walletHandler?: (event: Event) => void;
  leaderboardHandler?: (event: Event) => void;
  
  // Audio
  backgroundMusic!: Phaser.Sound.BaseSound;
  
  // State flags
  isStarting: boolean = false;
  selectedDifficulty: "easy" | "hard" | "cursed" = "easy";
  walletAddress: string | null = null;

  constructor() {
    super({
      key: "TitleScreen",
    });
    this.isStarting = false;
  }

  init(): void {
    // Reset start flag
    this.isStarting = false;
    
    // Try to auto-reconnect wallet
    this.walletAddress = getConnectedWallet();
  }

  create(): void {
    // Initialize sounds first
    this.initializeSounds();
    
    // Create DOM UI (includes background)
    this.createDOMUI();

    // Set up input controls
    this.setupInputs();

    // Play background music
    this.playBackgroundMusic();
    
    // Listen for scene shutdown to cleanup event listeners
    this.events.once('shutdown', () => {
      this.cleanupEventListeners();
    });
  }

  createDOMUI(): void {
    
    // Use asset paths directly (images are in public/assets/images/)
    const jungleBackgroundURL = '/assets/images/jungle_background.png';
    const titleImageURL = '/assets/images/degen_force_title.png';
    
    // Generate SVG Data URL for clickable container
    let uiHTML = `
      <div id="title-screen-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col justify-between items-center" style="image-rendering: pixelated; background-image: url('${jungleBackgroundURL}'); background-size: cover; background-position: center; background-repeat: no-repeat;">
        <!-- Main Content Container -->
        <div class="flex flex-col items-center space-y-10 justify-between pt-12 pb-20 w-full text-center pointer-events-auto h-full">
          
          <!-- Game Title Image Container -->
          <div id="game-title-container" class="flex-shrink-0 flex items-center justify-center">
            <img id="game-title-image" 
                 src="${titleImageURL}" 
                 alt="Degen Force" 
                 class="max-h-[460px] mx-20 object-contain pointer-events-none"
                 style="filter: drop-shadow(4px 4px 8px rgba(0,0,0,0.8));" />
          </div>

          <!-- Difficulty Selection -->
          <div id="difficulty-selection" class="flex flex-col space-y-4 items-center">
            <div class="text-white font-bold text-2xl mb-4" style="text-shadow: 3px 3px 0px #000000;">SELECT DIFFICULTY</div>
            <div class="flex space-x-6">
              <button id="easy-btn" class="game-pixel-container-clickable-green-500 px-6 py-3 text-white font-bold text-xl">EASY</button>
              <button id="hard-btn" class="game-pixel-container-clickable-orange-500 px-6 py-3 text-white font-bold text-xl">HARD</button>
              <button id="cursed-btn" class="game-pixel-container-clickable-red-600 px-6 py-3 text-white font-bold text-xl">CURSED</button>
            </div>
          </div>

          <!-- Press Enter Text -->
          <div id="press-enter-text" class="text-white font-bold pointer-events-none flex-shrink-0" style="
            font-size: 48px;
            text-shadow: 5px 5px 0px #000000;
            animation: titleBlink 1s ease-in-out infinite alternate;
          ">PRESS ENTER TO START</div>

          <!-- Additional Buttons -->
          <div class="flex space-x-6">
            <button id="wallet-btn" class="game-pixel-container-clickable-purple-600 px-6 py-3 text-white font-bold text-lg">
              CONNECT WALLET
            </button>
            <button id="leaderboard-btn" class="game-pixel-container-clickable-blue-600 px-6 py-3 text-white font-bold text-lg">
              LEADERBOARD
            </button>
          </div>

          <!-- Wallet Status -->
          <div id="wallet-status" class="text-white font-bold text-sm hidden" style="text-shadow: 2px 2px 0px #000000;">
            Connected: <span id="wallet-address" class="text-green-400"></span>
          </div>

        </div>

        <!-- Custom Animations and Styles -->
        <style>
          @keyframes titleBlink {
            from { opacity: 0.3; }
            to { opacity: 1; }
          }
        </style>
      </div>
    `;

    // Add DOM element to the scene
    this.uiContainer = utils.initUIDom(this, uiHTML);
    
    // Update wallet status display
    this.updateWalletDisplay();
  }

  setupInputs(): void {
    // Add HTML event listeners for keyboard and mouse events
    const handleStart = (event: Event) => {
      event.preventDefault();
      this.startGame();
    };

    // Listen for Enter and Space key events on the document
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        this.startGame();
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    
    // Add difficulty button handlers
    const easyBtn = document.getElementById('easy-btn');
    const hardBtn = document.getElementById('hard-btn');
    const cursedBtn = document.getElementById('cursed-btn');
    
    if (easyBtn) {
      easyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedDifficulty = 'easy';
        this.startGame();
      });
    }
    
    if (hardBtn) {
      hardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedDifficulty = 'hard';
        this.startGame();
      });
    }
    
    if (cursedBtn) {
      cursedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedDifficulty = 'cursed';
        this.startGame();
      });
    }

    // Store event listeners for cleanup
    this.keydownHandler = handleKeyDown;
    this.clickHandler = handleStart;
  }

  initializeSounds(): void {
    // Initialize background music
    this.backgroundMusic = this.sound.add("jungle_battle_theme", {
      volume: 0.4,
      loop: true
    });
  }

  playBackgroundMusic(): void {
    // Play the initialized background music
    if (this.backgroundMusic) {
      this.backgroundMusic.play();
    }
  }

  startGame(): void {
    // Prevent multiple triggers
    if (this.isStarting) return;
    this.isStarting = true;

    // Clean up event listeners
    this.cleanupEventListeners();

    // Stop background music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
    }

    // Add transition effect
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    // Start infinite survival mode with selected difficulty
    this.time.delayedCall(500, () => {
      console.log(`Starting game with difficulty: ${this.selectedDifficulty}`);
      this.scene.start("InfiniteSurvivalScene", { difficulty: this.selectedDifficulty });
    });
  }

  cleanupEventListeners(): void {
    // Remove HTML event listeners
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
    
    if (this.clickHandler && this.uiContainer && this.uiContainer.node) {
      this.uiContainer.node.removeEventListener('click', this.clickHandler);
    }
  }

  update(): void {
    // Title screen doesn't need special update logic
  }
}
