import Phaser from 'phaser';
import * as utils from '../utils';

interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  score: number;
  survival_time: string;
  enemies_killed: number;
  biome_reached: string;
  difficulty: string;
  timestamp: string;
}

export class LeaderboardScene extends Phaser.Scene {
  uiContainer!: Phaser.GameObjects.DOMElement;
  leaderboardData: LeaderboardEntry[] = [];
  isLoading: boolean = true;
  backHandler?: (event: Event) => void;

  constructor() {
    super({
      key: "LeaderboardScene",
    });
  }

  init(): void {
    this.isLoading = true;
    this.leaderboardData = [];
  }

  create(): void {
    // Create initial UI with loading state
    this.createDOMUI();

    // Fetch leaderboard data
    this.fetchLeaderboard();

    // Listen for scene shutdown to cleanup event listeners
    this.events.once('shutdown', () => {
      this.cleanupEventListeners();
    });
  }

  async fetchLeaderboard(): Promise<void> {
    try {
      // Use absolute path for production - Kubernetes ingress will route /api/* to backend
      const apiUrl = '/api/leaderboard?limit=100';
      console.log('[Leaderboard] Fetching from:', apiUrl);
      console.log('[Leaderboard] Full URL:', window.location.origin + apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      console.log('[Leaderboard] Response status:', response.status);
      console.log('[Leaderboard] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Leaderboard] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Leaderboard] Data received:', data);

      if (data.status === 'success') {
        this.leaderboardData = data.leaderboard || [];
        this.isLoading = false;
        console.log('[Leaderboard] Loaded', this.leaderboardData.length, 'scores');
        this.updateLeaderboardUI();
      } else {
        throw new Error('Invalid response status');
      }
    } catch (error) {
      console.error('[Leaderboard] ERROR:', error);
      console.error('[Leaderboard] Error type:', error instanceof Error ? error.message : 'Unknown error');
      this.isLoading = false;
      this.leaderboardData = [];
      this.updateLeaderboardUI();
    }
  }

  createDOMUI(): void {
    const jungleBackgroundURL = '/assets/images/jungle_background.png';

    let uiHTML = `
      <div id="leaderboard-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro" style="image-rendering: pixelated; background-image: url('${jungleBackgroundURL}'); background-size: cover; background-position: center; background-repeat: no-repeat;">
        
        <div class="flex flex-col items-center justify-start pt-8 pb-8 w-full h-full pointer-events-auto overflow-y-auto">
          
          <!-- Title -->
          <div class="text-yellow-400 font-bold mb-8" style="font-size: 64px; text-shadow: 4px 4px 0px #000000;">
            LEADERBOARD
          </div>

          <!-- Loading State -->
          <div id="loading-state" class="text-white font-bold text-2xl" style="text-shadow: 2px 2px 0px #000000;">
            Loading leaderboard...
          </div>

          <!-- Leaderboard Table Container -->
          <div id="leaderboard-table-container" class="hidden w-full max-w-6xl px-4">
            <div class="game-pixel-container-[#2C3E50] p-6">
              
              <!-- Table Header -->
              <div class="grid grid-cols-3 gap-8 text-white font-bold text-xl mb-4 pb-2 border-b-2 border-gray-600" style="text-shadow: 1px 1px 0px #000000;">
                <div class="text-center">RANK</div>
                <div class="text-center">WALLET</div>
                <div class="text-center">SCORE</div>
              </div>

              <!-- Table Rows -->
              <div id="leaderboard-rows" class="space-y-2 max-h-[500px] overflow-y-auto">
                <!-- Rows will be inserted here -->
              </div>

            </div>
          </div>

          <!-- Empty State -->
          <div id="empty-state" class="hidden text-white font-bold text-xl" style="text-shadow: 2px 2px 0px #000000;">
            No scores yet. Be the first to submit!
          </div>

          <!-- Back Button -->
          <button id="back-btn" class="mt-8 game-pixel-container-clickable-gray-700 px-8 py-4 text-white font-bold text-xl">
            BACK TO MENU
          </button>

        </div>

        <style>
          #leaderboard-rows::-webkit-scrollbar {
            width: 8px;
          }
          #leaderboard-rows::-webkit-scrollbar-track {
            background: #1a1a1a;
          }
          #leaderboard-rows::-webkit-scrollbar-thumb {
            background: #555;
            border-radius: 4px;
          }
          #leaderboard-rows::-webkit-scrollbar-thumb:hover {
            background: #777;
          }
        </style>
      </div>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);
    
    // Setup back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      const handler = (e: Event) => {
        e.stopPropagation();
        this.goBack();
      };
      backBtn.addEventListener('click', handler);
      this.backHandler = handler;
    }
  }

  updateLeaderboardUI(): void {
    const loadingState = document.getElementById('loading-state');
    const tableContainer = document.getElementById('leaderboard-table-container');
    const emptyState = document.getElementById('empty-state');
    const rowsContainer = document.getElementById('leaderboard-rows');

    if (!loadingState || !tableContainer || !emptyState || !rowsContainer) return;

    if (this.isLoading) {
      // Still loading - show loading state
      loadingState.classList.remove('hidden');
      tableContainer.classList.add('hidden');
      emptyState.classList.add('hidden');
      return;
    }

    // Hide loading
    loadingState.classList.add('hidden');

    if (this.leaderboardData.length === 0) {
      // Show empty state
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = 'No scores yet. Be the first to play!';
      tableContainer.classList.add('hidden');
    } else {
      // Show table with data
      emptyState.classList.add('hidden');
      tableContainer.classList.remove('hidden');

      // Generate rows
      let rowsHTML = '';
      this.leaderboardData.forEach((entry) => {
        const rankColor = entry.rank === 1 ? 'text-yellow-400' : 
                         entry.rank === 2 ? 'text-gray-300' : 
                         entry.rank === 3 ? 'text-orange-400' : 'text-white';

        rowsHTML += `
          <div class="grid grid-cols-3 gap-8 text-white text-lg py-3 px-4 hover:bg-gray-800 rounded" style="text-shadow: 1px 1px 0px #000000;">
            <div class="text-center ${rankColor} font-bold text-2xl">#${entry.rank}</div>
            <div class="text-center text-cyan-400 font-mono">${this.shortenAddress(entry.wallet_address)}</div>
            <div class="text-center font-bold text-yellow-400 text-xl">${entry.score.toLocaleString()}</div>
          </div>
        `;
      });

      rowsContainer.innerHTML = rowsHTML;
    }
  }

  shortenAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  goBack(): void {
    this.cleanupEventListeners();
    this.scene.start('TitleScreen');
  }

  cleanupEventListeners(): void {
    if (this.backHandler) {
      const backBtn = document.getElementById('back-btn');
      if (backBtn) {
        backBtn.removeEventListener('click', this.backHandler);
      }
    }
  }

  update(): void {
    // No update logic needed
  }
}
