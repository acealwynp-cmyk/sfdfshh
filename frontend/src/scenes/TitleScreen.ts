import Phaser from 'phaser';
import { LevelManager } from '../LevelManager.js';
import * as utils from '../utils';
import { connectWallet, disconnectWallet, getConnectedWallet, shortenAddress, isWalletConnected, autoReconnectWallet } from '../walletUtils';

export class TitleScreen extends Phaser.Scene {
  // UI elements
  uiContainer!: Phaser.GameObjects.DOMElement;
  
  // Input controls - HTML event handlers
  leaderboardHandler?: (event: Event) => void;
  
  // Audio
  backgroundMusic!: Phaser.Sound.BaseSound;
  
  // State flags
  isStarting: boolean = false;
  selectedDifficulty: "easy" | "hard" | "cursed" = "easy";
  walletAddress: string | null = null;
  showDifficultySelection: boolean = false;
  playMode: "guest" | "wallet" = "guest";

  constructor() {
    super({
      key: "TitleScreen",
    });
    this.isStarting = false;
  }

  init(): void {
    // Reset start flag
    this.isStarting = false;
    this.showDifficultySelection = false;
    this.playMode = "guest";
    
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
      <div id="title-screen-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col justify-center items-center" style="image-rendering: pixelated; background-image: url('${jungleBackgroundURL}'); background-size: cover; background-position: center; background-repeat: no-repeat;">
        
        <!-- Top Left Buttons Container -->
        <div class="fixed top-4 left-4 pointer-events-auto flex gap-3">
          <!-- Follow Button -->
          <a href="https://x.com/degenforcegame" target="_blank" rel="noopener noreferrer" 
             class="game-pixel-container-clickable-blue-500 px-6 py-3 text-white font-bold text-base flex items-center gap-2 no-underline">
            <span>🐦 FOLLOW</span>
          </a>
          
          <!-- $DFORCE Token Button -->
          <a href="https://jup.ag/tokens/An7X2BapeLa7F2s686bYB3A3gAdvmFfe6Nb9iEdapump" target="_blank" rel="noopener noreferrer" 
             class="game-pixel-container-clickable-green-500 px-6 py-3 text-white font-bold text-base flex items-center gap-2 no-underline">
            <span>💰 $DFORCE</span>
          </a>
        </div>

        <!-- Disconnect Wallet Button (Top Right) -->
        <div id="disconnect-wallet-container" class="fixed top-4 right-4 pointer-events-auto hidden">
          <button id="disconnect-wallet-btn" class="game-pixel-container-clickable-red-600 px-4 py-2 text-white font-bold text-sm flex items-center gap-2">
            <span>🔓 DISCONNECT</span>
          </button>
        </div>

        <!-- Main Menu Container -->
        <div id="main-menu" class="flex flex-col items-center space-y-6 w-full text-center pointer-events-auto">
          
          <!-- Game Title Image Container -->
          <div id="game-title-container" class="flex-shrink-0 flex items-center justify-center">
            <img id="game-title-image" 
                 src="${titleImageURL}" 
                 alt="Degen Force" 
                 class="max-h-[300px] mx-20 object-contain pointer-events-none"
                 style="filter: drop-shadow(4px 4px 8px rgba(0,0,0,0.8));" />
          </div>

          <!-- Play Mode Selection -->
          <div class="flex flex-col space-y-4 items-center">
            <div class="text-yellow-400 font-bold text-2xl mb-2" style="text-shadow: 3px 3px 0px #000000;">CHOOSE YOUR MODE</div>
            
            <button id="guest-play-btn" class="game-pixel-container-clickable-green-600 px-12 py-4 text-white font-bold text-xl min-w-[320px]">
              🎮 GUEST PLAY
            </button>
            
            <button id="wallet-play-btn" class="game-pixel-container-clickable-purple-600 px-12 py-4 text-white font-bold text-xl min-w-[320px]">
              💎 WALLET CONNECT PLAY
            </button>
            
            <button id="leaderboard-btn" class="game-pixel-container-clickable-blue-600 px-12 py-4 text-white font-bold text-lg min-w-[320px]">
              🏆 LEADERBOARD
            </button>
          </div>

          <!-- Wallet Status -->
          <div id="wallet-status" class="text-green-400 font-bold text-sm hidden" style="text-shadow: 2px 2px 0px #000000;">
            ✓ Connected: <span id="wallet-address" class="text-white"></span>
          </div>

        </div>

        <!-- Difficulty Selection Container (Hidden by default) -->
        <div id="difficulty-menu" class="hidden flex-col items-center space-y-6 w-full text-center pointer-events-auto">
          
          <!-- Game Title Image Container -->
          <div class="flex-shrink-0 flex items-center justify-center">
            <img src="${titleImageURL}" 
                 alt="Degen Force" 
                 class="max-h-[250px] mx-20 object-contain pointer-events-none"
                 style="filter: drop-shadow(4px 4px 8px rgba(0,0,0,0.8));" />
          </div>

          <!-- Difficulty Selection -->
          <div class="flex flex-col space-y-4 items-center">
            <div class="text-yellow-400 font-bold text-2xl" style="text-shadow: 3px 3px 0px #000000;">SELECT DIFFICULTY</div>
            <div class="flex space-x-4">
              <button id="easy-btn" class="game-pixel-container-clickable-green-500 px-8 py-4 text-white font-bold text-xl">
                EASY
              </button>
              <button id="hard-btn" class="game-pixel-container-clickable-orange-500 px-8 py-4 text-white font-bold text-xl">
                HARD
              </button>
              <button id="cursed-btn" class="game-pixel-container-clickable-red-600 px-8 py-4 text-white font-bold text-xl">
                CURSED
              </button>
            </div>
            
            <!-- Divider -->
            <div class="my-4 w-full flex items-center">
              <div class="flex-grow border-t-2 border-yellow-400" style="border-style: solid;"></div>
              <span class="px-4 text-yellow-400 font-bold text-sm" style="text-shadow: 2px 2px 0px #000000;">OR</span>
              <div class="flex-grow border-t-2 border-yellow-400" style="border-style: solid;"></div>
            </div>
            
            <!-- Franklin Mode Button (Always Easy Difficulty) -->
            <div class="flex flex-col items-center space-y-2">
              <button id="franklin-mode-btn" class="game-pixel-container-clickable-orange-600 px-12 py-4 text-white font-bold text-xl min-w-[320px]">
                🏖️ FRANKLIN MODE
              </button>
              <div class="text-cyan-400 text-sm font-bold" style="text-shadow: 1px 1px 0px #000000;">
                ⚡ LIMITED TIME EVENT - EASY MODE ONLY
              </div>
            </div>
          </div>

          <!-- Back Button -->
          <button id="back-to-menu-btn" class="game-pixel-container-clickable-gray-600 px-8 py-3 text-white font-bold text-lg">
            ← BACK
          </button>

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
    // Guest Play button
    const guestPlayBtn = document.getElementById('guest-play-btn');
    if (guestPlayBtn) {
      guestPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playMode = 'guest';
        this.showDifficultySelectionScreen();
      });
    }

    // Wallet Connect Play button
    const walletPlayBtn = document.getElementById('wallet-play-btn');
    if (walletPlayBtn) {
      walletPlayBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.playMode = 'wallet';
        
        // Connect wallet first
        if (!isWalletConnected()) {
          const address = await connectWallet();
          if (!address) {
            alert('Please install Phantom wallet extension to use Wallet Connect Play mode.');
            return;
          }
          this.walletAddress = address;
          this.updateWalletDisplay();
        }
        
        // Show difficulty selection
        this.showDifficultySelectionScreen();
      });
    }

    // Franklin Mode button
    const franklinModeBtn = document.getElementById('franklin-mode-btn');
    if (franklinModeBtn) {
      franklinModeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playMode = 'guest';
        this.selectedDifficulty = 'easy'; // Franklin Mode uses easy difficulty
        // Store franklin mode flag in registry for game scene to read
        this.registry.set('franklinMode', true);
        this.startGame(); // Start the game directly instead of showing difficulty screen
      });
    }

    // Disconnect Wallet button
    const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
    if (disconnectWalletBtn) {
      disconnectWalletBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.handleDisconnectWallet();
      });
    }

    // Leaderboard button
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (leaderboardBtn) {
      const leaderboardHandler = (e: Event) => {
        e.stopPropagation();
        this.showLeaderboard();
      };
      leaderboardBtn.addEventListener('click', leaderboardHandler);
      this.leaderboardHandler = leaderboardHandler;
    }

    // Difficulty button handlers
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

    // Back button
    const backBtn = document.getElementById('back-to-menu-btn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showMainMenu();
      });
    }
  }

  showDifficultySelectionScreen(): void {
    const mainMenu = document.getElementById('main-menu');
    const difficultyMenu = document.getElementById('difficulty-menu');
    
    if (mainMenu) mainMenu.classList.add('hidden');
    if (difficultyMenu) {
      difficultyMenu.classList.remove('hidden');
      difficultyMenu.classList.add('flex');
    }
  }

  showMainMenu(): void {
    const mainMenu = document.getElementById('main-menu');
    const difficultyMenu = document.getElementById('difficulty-menu');
    
    if (mainMenu) {
      mainMenu.classList.remove('hidden');
      mainMenu.classList.add('flex');
    }
    if (difficultyMenu) difficultyMenu.classList.add('hidden');
  }

  updateWalletDisplay(): void {
    const walletStatus = document.getElementById('wallet-status');
    const walletAddressEl = document.getElementById('wallet-address');
    const disconnectContainer = document.getElementById('disconnect-wallet-container');

    // Debug logging
    const address = getConnectedWallet();
    console.log('[Wallet Debug] Connected wallet:', address);
    console.log('[Wallet Debug] Disconnect button element:', disconnectContainer);
    console.log('[Wallet Debug] Wallet status element:', walletStatus);

    if (walletStatus && walletAddressEl) {
      if (address) {
        walletStatus.classList.remove('hidden');
        walletAddressEl.textContent = shortenAddress(address);
        
        // Show disconnect button
        if (disconnectContainer) {
          disconnectContainer.classList.remove('hidden');
          console.log('[Wallet Debug] Disconnect button shown');
        } else {
          console.warn('[Wallet Debug] Disconnect button container not found!');
        }
      } else {
        walletStatus.classList.add('hidden');
        
        // Hide disconnect button
        if (disconnectContainer) {
          disconnectContainer.classList.add('hidden');
          console.log('[Wallet Debug] Disconnect button hidden');
        }
      }
    } else {
      console.warn('[Wallet Debug] Wallet status elements not found!');
    }
  }

  async handleDisconnectWallet(): Promise<void> {
    await disconnectWallet();
    this.walletAddress = null;
    this.updateWalletDisplay();
    console.log('Wallet disconnected');
  }

  showLeaderboard(): void {
    // Clean up and switch to leaderboard scene
    this.cleanupEventListeners();
    
    // Stop background music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
    }
    
    this.scene.start('LeaderboardScene');
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
    
    // Start infinite survival mode with selected difficulty and play mode
    this.time.delayedCall(500, () => {
      console.log(`Starting game with difficulty: ${this.selectedDifficulty}, mode: ${this.playMode}`);
      this.scene.start("InfiniteSurvivalScene", { 
        difficulty: this.selectedDifficulty,
        playMode: this.playMode,
        walletAddress: this.walletAddress
      });
    });
  }

  cleanupEventListeners(): void {
    if (this.leaderboardHandler) {
      const leaderboardBtn = document.getElementById('leaderboard-btn');
      if (leaderboardBtn) {
        leaderboardBtn.removeEventListener('click', this.leaderboardHandler);
      }
    }
  }

  update(): void {
    // Title screen doesn't need special update logic
  }
}
