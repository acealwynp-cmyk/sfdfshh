import Phaser from "phaser";
import * as utils from "../utils";

export class UIScene extends Phaser.Scene {
  public currentGameSceneKey: string | null;
  public uiContainer: Phaser.GameObjects.DOMElement | null;
  
  // UI update timer
  public updateTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({
      key: "UIScene",
    });
    this.currentGameSceneKey = null;
    this.uiContainer = null;
  }
  
  init(data: { gameSceneKey?: string }) {
    // Receive current game scene key
    this.currentGameSceneKey = data.gameSceneKey || null;
  }

  create(): void {
    // Create UI DOM
    this.createUI();
    
    // Start UI update timer
    this.updateTimer = this.time.addEvent({
      delay: 100, // Update every 100ms
      callback: this.updateUI,
      callbackScope: this,
      loop: true
    });
  }

  createUI(): void {
    const uiHTML = `
      <div id="game-ui-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro">
        <!-- Top HUD -->
        <div class="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
          
          <!-- Left Side - Score and Weapon -->
          <div class="flex flex-col space-y-2">
            <!-- Score Display -->
            <div class="game-pixel-container-[#2C3E50] p-3 min-w-[200px]">
              <div class="text-white font-bold text-lg text-center" style="text-shadow: 2px 2px 0px #000000;">
                SCORE: <span id="score-value" class="text-yellow-400">0</span>
              </div>
            </div>
            
            <!-- Survival Time Display -->
            <div class="game-pixel-container-[#27AE60] p-3 min-w-[200px]">
              <div class="text-white font-bold text-sm text-center" style="text-shadow: 2px 2px 0px #000000;">
                TIME: <span id="survival-time" class="text-green-400">00:00</span>
              </div>
            </div>
            
            <!-- Weapon Display -->
            <div class="game-pixel-container-[#34495E] p-3 min-w-[200px]">
              <div class="text-white font-bold text-sm text-center" style="text-shadow: 2px 2px 0px #000000;">
                WEAPON: <span id="weapon-name" class="text-cyan-400">Combat Rifle</span>
              </div>
            </div>
          </div>

          <!-- Center - Biome Info -->
          <div class="flex flex-col space-y-2">
            <!-- Current Biome -->
            <div class="game-pixel-container-[#E74C3C] p-3 min-w-[300px]">
              <div class="text-white font-bold text-lg text-center" style="text-shadow: 2px 2px 0px #000000;">
                BIOME: <span id="biome-name" class="text-red-400">Tropical Jungle</span>
              </div>
            </div>
            
            <!-- Biome Timer - REMOVED (teleport is now a surprise!) -->
          </div>

          <!-- Right Side - Health and Status -->
          <div class="flex flex-col space-y-2">
            <!-- Health Bar -->
            <div class="game-pixel-container-slot-gray-700 p-2 w-[250px]">
              <div class="text-white font-bold text-sm text-center mb-2" style="text-shadow: 2px 2px 0px #000000;">HEALTH</div>
              <div class="game-pixel-container-slot-gray-800 p-1 relative">
                <div id="health-fill" class="game-pixel-container-progress-fill-green-500 h-6 transition-all duration-300" style="width: 100%;">
                </div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span id="health-text" class="text-white font-bold text-xs" style="text-shadow: 1px 1px 0px #000000;">100/100</span>
                </div>
              </div>
            </div>
            
            <!-- Enemy Count -->
            <div class="game-pixel-container-[#8E44AD] p-2 w-[250px]">
              <div class="text-white font-bold text-sm text-center" style="text-shadow: 2px 2px 0px #000000;">
                ENEMIES: <span id="enemy-count" class="text-purple-400">0</span>
              </div>
            </div>
          </div>
          
        </div>

        <!-- Controls Info (Bottom Left) -->
        <div class="absolute bottom-4 left-4 pointer-events-auto">
          <div class="game-pixel-container-[#2C3E50] p-3 max-w-[300px]">
            <div class="text-white font-bold text-xs" style="text-shadow: 1px 1px 0px #000000;">
              <div>WASD / ARROWS: Move</div>
              <div>W / UP: Jump</div>
              <div>SPACE: Shoot</div>
              <div>Q: Switch Weapon</div>
              <div id="powerup-controls" class="mt-2 hidden">
                <div class="text-yellow-300">--- FRANKLIN MODE ---</div>
                <div>1: Health Potion 💊</div>
                <div>2: Shield Potion 🛡️</div>
                <div>3: Invincibility ⭐</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Power-Ups Display (Bottom Center) - Franklin Mode Only -->
        <div id="powerups-display" class="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto hidden">
          <div class="game-pixel-container-[#F39C12] p-4 min-w-[450px]">
            <div class="text-white font-bold text-base text-center mb-3" style="text-shadow: 2px 2px 0px #000000;">
              🏖️ FRANKLIN'S POWER-UPS
            </div>
            <div class="flex justify-around gap-6">
              <!-- Health Potion Button -->
              <button id="health-potion-btn" class="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity game-pixel-container-clickable-green-600 p-2 min-w-[100px]">
                <canvas id="health-potion-canvas" width="64" height="64" class="mb-2" style="image-rendering: pixelated;"></canvas>
                <div class="text-white text-xs font-bold">1: HEALTH</div>
                <div id="health-potion-status" class="text-green-400 text-xs font-bold mt-1">READY</div>
              </button>
              
              <!-- Shield Potion Button -->
              <button id="shield-potion-btn" class="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity game-pixel-container-clickable-blue-600 p-2 min-w-[100px]">
                <canvas id="shield-potion-canvas" width="64" height="64" class="mb-2" style="image-rendering: pixelated;"></canvas>
                <div class="text-white text-xs font-bold">2: SHIELD</div>
                <div id="shield-potion-status" class="text-green-400 text-xs font-bold mt-1">READY</div>
              </button>
              
              <!-- Invincibility Potion Button -->
              <button id="invincibility-potion-btn" class="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity game-pixel-container-clickable-yellow-500 p-2 min-w-[100px]">
                <canvas id="invincibility-potion-canvas" width="64" height="64" class="mb-2" style="image-rendering: pixelated;"></canvas>
                <div class="text-white text-xs font-bold">3: INVINCIBLE</div>
                <div id="invincibility-potion-status" class="text-green-400 text-xs font-bold mt-1">READY</div>
              </button>
            </div>
          </div>
        </div>

        <!-- Biome Transition Warning (Center) -->
        <div id="biome-warning" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto hidden">
          <div class="game-pixel-container-[#E74C3C] p-4 min-w-[400px]">
            <div class="text-white font-bold text-xl text-center animate-pulse" style="text-shadow: 3px 3px 0px #000000;">
              BIOME CHANGING IN <span id="warning-timer" class="text-yellow-400">30</span>s!
            </div>
            <div class="text-white font-bold text-sm text-center mt-2" style="text-shadow: 2px 2px 0px #000000;">
              NEXT: <span id="next-biome-name" class="text-cyan-400">Desert Wasteland</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  updateUI(): void {
    if (!this.currentGameSceneKey) return;
    
    const gameScene = this.scene.get(this.currentGameSceneKey) as any;
    if (!gameScene || !gameScene.player) return;

    const player = gameScene.player;
    
    // Check if Franklin mode is active
    const isFranklinMode = (gameScene as any).franklinMode || false;
    
    // Show/hide Franklin mode UI elements
    const powerupControls = document.getElementById("powerup-controls");
    const powerupsDisplay = document.getElementById("powerups-display");
    
    if (powerupControls) {
      if (isFranklinMode) {
        powerupControls.classList.remove("hidden");
      } else {
        powerupControls.classList.add("hidden");
      }
    }
    
    if (powerupsDisplay) {
      if (isFranklinMode) {
        powerupsDisplay.classList.remove("hidden");
        // Update power-up status
        this.updatePowerUpStatus(gameScene);
      } else {
        powerupsDisplay.classList.add("hidden");
      }
    }
    
    // Update score
    const scoreElement = document.getElementById("score-value");
    if (scoreElement && gameScene.getScore) {
      scoreElement.textContent = gameScene.getScore().toString();
    }

    // Update survival time
    const survivalTimeElement = document.getElementById("survival-time");
    if (survivalTimeElement && gameScene.getFormattedSurvivalTime) {
      survivalTimeElement.textContent = gameScene.getFormattedSurvivalTime();
    }

    // Update weapon name
    const weaponElement = document.getElementById("weapon-name");
    if (weaponElement) {
      weaponElement.textContent = player.getCurrentWeaponName();
    }

    // Update current biome
    const biomeElement = document.getElementById("biome-name");
    if (biomeElement && gameScene.getCurrentBiomeName) {
      biomeElement.textContent = gameScene.getCurrentBiomeName();
    }

    // Biome timer removed - teleport is now a surprise with countdown only!

    // Update health bar
    const healthFill = document.getElementById("health-fill");
    const healthText = document.getElementById("health-text");
    if (healthFill && healthText) {
      const healthPercent = player.getHealthPercentage();
      healthFill.style.width = `${healthPercent}%`;
      healthText.textContent = `${player.health}/${player.maxHealth}`;
      
      // Change health bar color based on health level
      healthFill.className = healthFill.className.replace(
        /game-pixel-container-progress-fill-\w+-\d+/,
        healthPercent > 60 ? "game-pixel-container-progress-fill-green-500" :
        healthPercent > 30 ? "game-pixel-container-progress-fill-yellow-500" :
        "game-pixel-container-progress-fill-red-500"
      );
    }

    // Update enemy count
    const enemyCountElement = document.getElementById("enemy-count");
    if (enemyCountElement && gameScene.enemies) {
      const activeEnemies = gameScene.enemies.children.entries.filter((enemy: any) => enemy.active).length;
      enemyCountElement.textContent = activeEnemies.toString();
    }
  }

  showBiomeTransitionWarning(secondsLeft: number, gameScene: any): void {
    const warningElement = document.getElementById("biome-warning");
    const timerElement = document.getElementById("warning-timer");
    const nextBiomeElement = document.getElementById("next-biome-name");
    
    if (warningElement && timerElement && nextBiomeElement) {
      warningElement.classList.remove("hidden");
      timerElement.textContent = secondsLeft.toString();
      
      if (gameScene.biomeManager && gameScene.biomeManager.getNextBiome) {
        nextBiomeElement.textContent = gameScene.biomeManager.getNextBiome().displayName;
      }
    }
  }

  hideBiomeTransitionWarning(): void {
    const warningElement = document.getElementById("biome-warning");
    if (warningElement) {
      warningElement.classList.add("hidden");
    }
  }
  
  updatePowerUpStatus(gameScene: any): void {
    if (!gameScene.powerUpSystem) return;
    
    const powerUpSystem = gameScene.powerUpSystem;
    
    // Update Health Potion status
    const healthStatus = document.getElementById("health-potion-status");
    if (healthStatus) {
      if (!powerUpSystem.healthPotionAvailable) {
        healthStatus.textContent = "USED";
        healthStatus.className = "text-gray-500 text-xs font-bold";
      } else {
        healthStatus.textContent = "READY";
        healthStatus.className = "text-green-400 text-xs font-bold";
      }
    }
    
    // Update Shield Potion status
    const shieldStatus = document.getElementById("shield-potion-status");
    if (shieldStatus) {
      if (powerUpSystem.shieldActive) {
        shieldStatus.textContent = "ACTIVE";
        shieldStatus.className = "text-cyan-400 text-xs font-bold animate-pulse";
      } else if (!powerUpSystem.shieldPotionAvailable) {
        shieldStatus.textContent = "USED";
        shieldStatus.className = "text-gray-500 text-xs font-bold";
      } else {
        shieldStatus.textContent = "READY";
        shieldStatus.className = "text-green-400 text-xs font-bold";
      }
    }
    
    // Update Invincibility Potion status
    const invincibilityStatus = document.getElementById("invincibility-potion-status");
    if (invincibilityStatus) {
      if (powerUpSystem.invincibilityActive) {
        invincibilityStatus.textContent = "ACTIVE";
        invincibilityStatus.className = "text-yellow-400 text-xs font-bold animate-pulse";
      } else if (!powerUpSystem.invincibilityPotionAvailable) {
        invincibilityStatus.textContent = "USED";
        invincibilityStatus.className = "text-gray-500 text-xs font-bold";
      } else {
        invincibilityStatus.textContent = "READY";
        invincibilityStatus.className = "text-green-400 text-xs font-bold";
      }
    }
  }

  shutdown(): void {
    // Clean up timer
    if (this.updateTimer) {
      this.updateTimer.destroy();
    }
    
    // Clean up DOM
    if (this.uiContainer) {
      this.uiContainer.destroy();
    }
  }
}