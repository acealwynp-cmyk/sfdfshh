import Phaser from 'phaser';
import * as utils from '../utils';
import { isWalletConnected, getConnectedWallet } from '../walletUtils';

interface GameOverData {
  currentLevelKey?: string;
  score?: number;
  survivalTime?: string;
  survivalTimeSeconds?: number;
  enemiesKilled?: number;
  biomeReached?: string;
  difficulty?: string;
}

interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  score: number;
  survival_time: string;
  enemies_killed: number;
  biome_reached: string;
  difficulty: string;
}

export class GameOverUIScene extends Phaser.Scene {
  private currentLevelKey: string | null;
  private isRestarting: boolean;
  private uiContainer: Phaser.GameObjects.DOMElement | null;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  
  // Game stats
  private score: number = 0;
  private survivalTime: string = "00:00";
  private survivalTimeSeconds: number = 0;
  private enemiesKilled: number = 0;
  private biomeReached: string = "Unknown";
  private difficulty: string = "easy";
  
  // Leaderboard data
  private leaderboardData: LeaderboardEntry[] = [];
  private isSubmitted: boolean = false;
  
  // Event handlers
  private submitHandler?: (event: Event) => void;
  private viewLeaderboardHandler?: (event: Event) => void;
  private restartHandler?: (event: Event) => void;

  constructor() {
    super({
      key: "GameOverUIScene",
    });
    this.currentLevelKey = null;
    this.isRestarting = false;
    this.uiContainer = null;
  }

  init(data: GameOverData) {
    // Receive data from level scene
    this.currentLevelKey = data.currentLevelKey || "InfiniteSurvivalScene";
    this.score = data.score || 0;
    this.survivalTime = data.survivalTime || "00:00";
    this.survivalTimeSeconds = data.survivalTimeSeconds || 0;
    this.enemiesKilled = data.enemiesKilled || 0;
    this.biomeReached = data.biomeReached || "Unknown";
    this.difficulty = data.difficulty || "easy";
    
    // Reset flags
    this.isRestarting = false;
    this.isSubmitted = false;
    this.leaderboardData = [];
  }

  create(): void {
    // Create DOM UI
    this.createDOMUI();
    // Setup input controls
    this.setupInputs();
    // Fetch top leaderboard
    this.fetchLeaderboard();

    // Listen for scene shutdown to cleanup event listeners
    this.events.once('shutdown', () => {
      this.cleanupEventListeners();
    });
  }

  async fetchLeaderboard(): Promise<void> {
    try {
      const response = await fetch(`/api/leaderboard?limit=10&difficulty=${this.difficulty}`);
      const data = await response.json();

      if (data.status === 'success') {
        this.leaderboardData = data.leaderboard || [];
        this.updateLeaderboardDisplay();
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }

  createDOMUI(): void {
    const uiHTML = `
      <div id="game-over-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col justify-center items-center overflow-y-auto" style="background-color: rgba(51, 0, 0, 0.9);">
        <!-- Main Content Container -->
        <div class="flex flex-col items-center justify-center gap-8 p-8 text-center pointer-events-auto max-w-7xl">
          
          <!-- Game Over Title -->
          <div id="game-over-title" class="text-red-500 font-bold pointer-events-none" style="
            font-size: 64px;
            text-shadow: 4px 4px 0px #000000;
            animation: dangerBlink 0.5s ease-in-out infinite alternate;
          ">GAME OVER</div>

          <!-- Main Content Grid -->
          <div class="grid grid-cols-2 gap-8 w-full">
            
            <!-- Left Column: Stats -->
            <div class="flex flex-col gap-4">
              <div id="survival-stats" class="game-pixel-container-[#2C3E50] p-6">
                <div class="text-white font-bold text-2xl text-center mb-4" style="text-shadow: 2px 2px 0px #000000;">
                  YOUR STATS
                </div>
                <div class="flex justify-between text-white font-bold text-lg mb-2" style="text-shadow: 1px 1px 0px #000000;">
                  <span>SCORE:</span>
                  <span id="final-score" class="text-yellow-400">${this.score}</span>
                </div>
                <div class="flex justify-between text-white font-bold text-lg mb-2" style="text-shadow: 1px 1px 0px #000000;">
                  <span>TIME:</span>
                  <span id="final-survival-time" class="text-green-400">${this.survivalTime}</span>
                </div>
                <div class="flex justify-between text-white font-bold text-lg mb-2" style="text-shadow: 1px 1px 0px #000000;">
                  <span>KILLS:</span>
                  <span id="final-enemies-killed" class="text-red-400">${this.enemiesKilled}</span>
                </div>
                <div class="flex justify-between text-white font-bold text-lg mb-2" style="text-shadow: 1px 1px 0px #000000;">
                  <span>BIOME:</span>
                  <span id="final-biome" class="text-purple-400">${this.biomeReached}</span>
                </div>
                <div class="flex justify-between text-white font-bold text-lg" style="text-shadow: 1px 1px 0px #000000;">
                  <span>DIFFICULTY:</span>
                  <span id="final-difficulty" class="text-orange-400 uppercase">${this.difficulty}</span>
                </div>
              </div>

              <!-- Wallet Actions -->
              <div id="wallet-section" class="flex flex-col gap-2">
                <button id="submit-score-btn" class="game-pixel-container-clickable-green-600 px-6 py-3 text-white font-bold text-lg">
                  SUBMIT TO LEADERBOARD
                </button>
                <div id="submit-status" class="text-white font-bold text-sm hidden" style="text-shadow: 1px 1px 0px #000000;">
                  Score submitted!
                </div>
                <div id="wallet-required" class="text-yellow-400 font-bold text-sm hidden" style="text-shadow: 1px 1px 0px #000000;">
                  Connect wallet to submit score
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-col gap-2">
                <button id="restart-btn" class="game-pixel-container-clickable-blue-600 px-6 py-3 text-white font-bold text-lg">
                  PLAY AGAIN
                </button>
                <button id="view-full-leaderboard-btn" class="game-pixel-container-clickable-purple-600 px-6 py-3 text-white font-bold text-lg">
                  VIEW FULL LEADERBOARD
                </button>
              </div>
            </div>

            <!-- Right Column: Top 10 Leaderboard -->
            <div class="flex flex-col">
              <div class="game-pixel-container-[#1a1a1a] p-6">
                <div class="text-yellow-400 font-bold text-2xl text-center mb-4" style="text-shadow: 2px 2px 0px #000000;">
                  TOP 10 LEADERBOARD
                </div>
                
                <!-- Leaderboard List -->
                <div id="leaderboard-list" class="space-y-2 max-h-[400px] overflow-y-auto">
                  <div class="text-white text-center">Loading...</div>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- Custom Animations -->
        <style>
          @keyframes dangerBlink {
            from { 
              opacity: 0.5; 
              filter: brightness(1);
            }
            to { 
              opacity: 1; 
              filter: brightness(1.2);
            }
          }
          
          @keyframes blink {
            from { opacity: 0.3; }
            to { opacity: 1; }
          }

          #leaderboard-list::-webkit-scrollbar {
            width: 6px;
          }
          #leaderboard-list::-webkit-scrollbar-track {
            background: #000;
          }
          #leaderboard-list::-webkit-scrollbar-thumb {
            background: #555;
            border-radius: 3px;
          }
        </style>
      </div>
    `;

    // Add DOM element to scene
    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  setupInputs(): void {
    // Submit score button
    const submitBtn = document.getElementById('submit-score-btn');
    if (submitBtn) {
      const handler = async (e: Event) => {
        e.stopPropagation();
        await this.submitScore();
      };
      submitBtn.addEventListener('click', handler);
      this.submitHandler = handler;
    }

    // View full leaderboard button
    const viewLeaderboardBtn = document.getElementById('view-full-leaderboard-btn');
    if (viewLeaderboardBtn) {
      const handler = (e: Event) => {
        e.stopPropagation();
        this.viewFullLeaderboard();
      };
      viewLeaderboardBtn.addEventListener('click', handler);
      this.viewLeaderboardHandler = handler;
    }

    // Restart button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      const handler = (e: Event) => {
        e.stopPropagation();
        this.restartGame();
      };
      restartBtn.addEventListener('click', handler);
      this.restartHandler = handler;
    }

    // Create keyboard input
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Listen for key events - restart game
    this.enterKey.on('down', () => this.restartGame());
    this.spaceKey.on('down', () => this.restartGame());
  }

  async submitScore(): Promise<void> {
    if (this.isSubmitted) {
      console.log('Score already submitted');
      return;
    }

    if (!isWalletConnected()) {
      // Show wallet required message
      const walletRequired = document.getElementById('wallet-required');
      if (walletRequired) {
        walletRequired.classList.remove('hidden');
      }
      console.log('Please connect wallet to submit score');
      return;
    }

    const walletAddress = getConnectedWallet();
    if (!walletAddress) return;

    try {
      const response = await fetch(`/api/leaderboard/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          score: this.score,
          survival_time_seconds: this.survivalTimeSeconds,
          enemies_killed: this.enemiesKilled,
          biome_reached: this.biomeReached,
          difficulty: this.difficulty,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.isSubmitted = true;
        
        // Show success message
        const submitStatus = document.getElementById('submit-status');
        const submitBtn = document.getElementById('submit-score-btn');
        if (submitStatus) {
          submitStatus.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.classList.add('hidden');
        }

        // Refresh leaderboard
        await this.fetchLeaderboard();
        
        console.log('Score submitted successfully!');
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }

  updateLeaderboardDisplay(): void {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;

    if (this.leaderboardData.length === 0) {
      leaderboardList.innerHTML = '<div class="text-white text-center">No scores yet</div>';
      return;
    }

    let html = '';
    this.leaderboardData.forEach((entry) => {
      const rankColor = entry.rank === 1 ? 'text-yellow-400' : 
                       entry.rank === 2 ? 'text-gray-300' : 
                       entry.rank === 3 ? 'text-orange-400' : 'text-white';

      html += `
        <div class="grid grid-cols-3 gap-4 items-center text-white text-base py-2 px-2 hover:bg-gray-800 rounded" style="text-shadow: 1px 1px 0px #000000;">
          <div class="${rankColor} font-bold text-center text-xl">#${entry.rank}</div>
          <div class="text-cyan-400 font-mono text-sm text-center">${this.shortenAddress(entry.wallet_address)}</div>
          <div class="text-yellow-400 font-bold text-right text-lg">${entry.score.toLocaleString()}</div>
        </div>
      `;
    });

    leaderboardList.innerHTML = html;
  }

  shortenAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  viewFullLeaderboard(): void {
    this.cleanupEventListeners();
    this.scene.stop('UIScene');
    this.scene.stop(this.currentLevelKey!);
    this.scene.start('LeaderboardScene');
  }

  restartGame(): void {
    // Prevent multiple triggers
    if (this.isRestarting) return;
    this.isRestarting = true;

    console.log(`Restarting current level: ${this.currentLevelKey}`);

    // Stop current level's background music
    const currentScene = this.scene.get(this.currentLevelKey!) as any;
    if (currentScene && currentScene.backgroundMusic) {
      currentScene.backgroundMusic.stop();
    }

    // Clear event listeners
    this.cleanupEventListeners();

    // Stop all game-related scenes
    this.scene.stop("UIScene");
    this.scene.stop(this.currentLevelKey!);
    
    // Restart current level
    this.scene.start(this.currentLevelKey!);
  }

  cleanupEventListeners(): void {
    if (this.submitHandler) {
      const submitBtn = document.getElementById('submit-score-btn');
      if (submitBtn) {
        submitBtn.removeEventListener('click', this.submitHandler);
      }
    }

    if (this.viewLeaderboardHandler) {
      const viewBtn = document.getElementById('view-full-leaderboard-btn');
      if (viewBtn) {
        viewBtn.removeEventListener('click', this.viewLeaderboardHandler);
      }
    }

    if (this.restartHandler) {
      const restartBtn = document.getElementById('restart-btn');
      if (restartBtn) {
        restartBtn.removeEventListener('click', this.restartHandler);
      }
    }

    if (this.enterKey) {
      this.enterKey.off('down');
    }
    if (this.spaceKey) {
      this.spaceKey.off('down');
    }
  }

  update(): void {
    // Game Over UI scene doesn't need special update logic
  }
}
