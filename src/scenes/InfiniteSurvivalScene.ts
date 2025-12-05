import Phaser from "phaser";
import * as utils from "../utils";
import { CommandoPlayer } from "../CommandoPlayer";
import { JungleEnemy } from "../JungleEnemy";
import { DesertEnemy } from "../DesertEnemy";
import { UrbanEnemy } from "../UrbanEnemy";
import { ArcticEnemy } from "../ArcticEnemy";
import { SpaceEnemy } from "../SpaceEnemy";
import { BiomeManager, BiomeType, type BiomeConfig } from "../BiomeManager";
import { screenSize, enemyConfig, difficultyConfig, gameplayConfig } from "../gameConfig.json";

export class InfiniteSurvivalScene extends Phaser.Scene {
  // Scene properties
  public gameCompleted: boolean = false;
  public mapHeight: number = 0;
  
  // Game objects
  public player!: CommandoPlayer;
  public enemies!: Phaser.GameObjects.Group;
  public playerProjectiles!: Phaser.GameObjects.Group;
  public enemyProjectiles!: Phaser.GameObjects.Group;
  
  // Ground platforms for infinite scrolling
  public groundPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  
  // Background
  public backgrounds!: Phaser.GameObjects.TileSprite[];

  // Game state
  public score: number = 0;
  public difficulty: "easy" | "hard" | "cursed" = "easy";
  public survivalTimeSeconds: number = 0;
  public gameStartTime: number = 0;
  
  // Enemy spawning
  public enemySpawner?: Phaser.Time.TimerEvent;
  public lastSpawnX: number = 0;

  // Background music
  public backgroundMusic?: Phaser.Sound.BaseSound;

  // Biome cycling system
  public biomeManager!: BiomeManager;
  public currentBiomeConfig!: BiomeConfig;
  public biomeTransitionInProgress: boolean = false;

  // Survival timer
  public survivalTimer?: Phaser.Time.TimerEvent;

  // Test key for manual biome cycling
  public bKey?: Phaser.Input.Keyboard.Key;

  // Infinite scrolling tracking
  public tileWidth: number = 64;
  public tileHeight: number = 64;

  constructor() {
    super({
      key: "InfiniteSurvivalScene",
    });
  }

  create(): void {
    console.log("Starting Infinite Survival Mode!");
    
    // Initialize game state
    this.gameCompleted = false;
    this.score = 0;
    this.survivalTimeSeconds = 0;
    this.gameStartTime = Date.now();
    this.biomeTransitionInProgress = false;

    // Initialize biome manager
    this.biomeManager = new BiomeManager(this);
    this.currentBiomeConfig = this.biomeManager.getCurrentBiome();

    // Set map height (20 tiles high)
    this.mapHeight = 20 * this.tileHeight;

    // Create infinite scrolling background
    this.createInfiniteBackground();

    // Create infinite ground platforms
    this.createInfiniteGround();

    // Create game object groups
    this.enemies = this.add.group();
    this.playerProjectiles = this.add.group();
    this.enemyProjectiles = this.add.group();

    // Create player
    this.createPlayer();

    // Set camera to follow player smoothly
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, this.mapHeight);

    // Set world boundaries (infinite horizontally, limited vertically)
    this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, this.mapHeight, false, false, false, false);

    // Setup collisions
    this.setupCollisions();

    // Start enemy spawning
    this.startEnemySpawning();

    // Start survival timer
    this.startSurvivalTimer();

    // Setup test controls
    this.setupTestControls();

    // Show UI
    this.scene.launch("UIScene", { gameSceneKey: this.scene.key });

    // Play biome-specific music
    this.playBiomeMusic();

    console.log(`Started in biome: ${this.currentBiomeConfig.displayName}`);
  }

  createInfiniteBackground(): void {
    // Destroy existing backgrounds
    if (this.backgrounds) {
      this.backgrounds.forEach(bg => bg.destroy());
    }
    
    this.backgrounds = [];
    
    // Create multiple layers of parallax scrolling tile sprites
    const bgWidth = screenSize.width.value * 3; // Wide enough for seamless tiling
    
    // Layer 1 - Far background (slower parallax)
    const bg1 = this.add.tileSprite(
      0,
      this.mapHeight / 2,
      bgWidth,
      this.mapHeight,
      this.currentBiomeConfig.backgroundKey
    );
    bg1.setOrigin(0, 0.5);
    bg1.setScrollFactor(0.1);
    bg1.setDepth(-20);
    this.backgrounds.push(bg1);
    
    // Layer 2 - Mid background
    const bg2 = this.add.tileSprite(
      0,
      this.mapHeight / 2,
      bgWidth,
      this.mapHeight,
      this.currentBiomeConfig.backgroundKey
    );
    bg2.setOrigin(0, 0.5);
    bg2.setScrollFactor(0.3);
    bg2.setDepth(-15);
    bg2.setAlpha(0.7);
    this.backgrounds.push(bg2);
    
    // Layer 3 - Near background
    const bg3 = this.add.tileSprite(
      0,
      this.mapHeight / 2,
      bgWidth,
      this.mapHeight,
      this.currentBiomeConfig.backgroundKey
    );
    bg3.setOrigin(0, 0.5);
    bg3.setScrollFactor(0.5);
    bg3.setDepth(-10);
    bg3.setAlpha(0.5);
    this.backgrounds.push(bg3);
  }

  createInfiniteGround(): void {
    // Create static group for ground platforms
    this.groundPlatforms = this.physics.add.staticGroup();

    // Create initial ground platforms
    const platformWidth = this.tileWidth * 8; // 8 tiles wide platforms
    const platformHeight = this.tileHeight;
    const groundY = 17 * this.tileHeight; // Ground level
    
    // Create several platforms to start
    for (let i = 0; i < 30; i++) {
      const x = i * platformWidth;
      const platform = this.add.rectangle(x, groundY, platformWidth, platformHeight, 0x44aa44);
      this.groundPlatforms.add(platform);
      
      // Also add some elevated platforms randomly
      if (Math.random() < 0.3) {
        const elevatedY = groundY - (this.tileHeight * (2 + Math.floor(Math.random() * 4)));
        const elevatedPlatform = this.add.rectangle(
          x + platformWidth / 2,
          elevatedY,
          platformWidth / 2,
          platformHeight,
          0x66cc66
        );
        this.groundPlatforms.add(elevatedPlatform);
      }
    }

    this.lastSpawnX = 30 * platformWidth;
  }

  playBiomeMusic(): void {
    // Stop current music
    if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
      this.backgroundMusic.stop();
    }

    // Play new biome music
    this.backgroundMusic = this.sound.add(this.currentBiomeConfig.musicKey, {
      volume: 0.6,
      loop: true
    });
    this.backgroundMusic.play();
  }

  createPlayer(): void {
    // Spawn player at the start
    const spawnX = 200;
    const spawnY = 15 * this.tileHeight;
    
    this.player = new CommandoPlayer(this, spawnX, spawnY);
  }

  startEnemySpawning(): void {
    // Start enemy spawner with biome-adjusted spawn rate
    const baseSpawnDelay = enemyConfig.spawnInterval.value;
    const difficultyMultiplier = this.biomeManager.getDifficultyMultiplier();
    const adjustedSpawnDelay = Math.max(1000, baseSpawnDelay / difficultyMultiplier);

    this.enemySpawner = this.time.addEvent({
      delay: adjustedSpawnDelay,
      callback: () => {
        this.spawnEnemy();
      },
      loop: true
    });
  }

  spawnEnemy(): void {
    // Don't spawn if max enemies reached
    const activeEnemies = this.enemies.children.entries.filter(enemy => enemy.active).length;
    const maxEnemies = Math.min(20, enemyConfig.maxEnemies.value + Math.floor(this.biomeManager.getDifficultyMultiplier()));
    
    if (activeEnemies >= maxEnemies) {
      return;
    }

    // Spawn enemy ahead of player
    const playerX = this.player.x;
    const spawnX = playerX + screenSize.width.value + Phaser.Math.Between(100, 400);
    
    // Random spawn Y positions
    const spawnYOptions = [
      15 * this.tileHeight,  // Ground level
      13 * this.tileHeight,  // Elevated 1
      11 * this.tileHeight,  // Elevated 2
      9 * this.tileHeight,   // Elevated 3
    ];
    
    const spawnY = Phaser.Utils.Array.GetRandom(spawnYOptions);
    
    const enemy = this.createEnemyForCurrentBiome(spawnX, spawnY);
    if (enemy) {
      this.enemies.add(enemy);
    }
  }

  createEnemyForCurrentBiome(x: number, y: number): any {
    const currentBiome = this.biomeManager.getCurrentBiome();
    const enemyType = Phaser.Utils.Array.GetRandom(currentBiome.enemyTypes);
    
    switch (enemyType) {
      case "jungle_soldier":
        return new JungleEnemy(this, x, y);
      case "desert_trooper":
        return new DesertEnemy(this, x, y);
      case "urban_sniper":
        return new UrbanEnemy(this, x, y);
      case "arctic_soldier":
        return new ArcticEnemy(this, x, y);
      case "space_cyborg":
        return new SpaceEnemy(this, x, y);
      default:
        return new JungleEnemy(this, x, y); // Fallback
    }
  }

  startSurvivalTimer(): void {
    // Update survival time every second
    this.survivalTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.survivalTimeSeconds++;
        
        // Check for biome transition
        if (this.biomeManager.shouldCycleBiome() && !this.biomeTransitionInProgress) {
          this.triggerBiomeTransition();
        }
      },
      loop: true
    });
  }

  triggerBiomeTransition(): void {
    if (this.biomeTransitionInProgress) return;
    
    this.biomeTransitionInProgress = true;
    console.log("Triggering biome transition...");
    
    // Show transition effect
    this.cameras.main.flash(2000, 255, 255, 255);
    
    // Change biome
    const biomeCycled = this.biomeManager.cycleToNextBiome();
    if (biomeCycled) {
      this.currentBiomeConfig = this.biomeManager.getCurrentBiome();
      
      // Transition to new biome after flash effect
      this.time.delayedCall(1000, () => {
        this.transitionToNewBiome();
      });
    } else {
      this.biomeTransitionInProgress = false;
    }
  }

  transitionToNewBiome(): void {
    console.log(`Transitioning to: ${this.currentBiomeConfig.displayName}`);
    
    // Update background for new biome
    this.backgrounds.forEach(bg => {
      bg.setTexture(this.currentBiomeConfig.backgroundKey);
    });

    // Play new biome music
    this.playBiomeMusic();

    // Restart enemy spawning with new difficulty
    if (this.enemySpawner) {
      this.enemySpawner.destroy();
    }
    this.startEnemySpawning();

    this.biomeTransitionInProgress = false;
    
    console.log(`Successfully transitioned to: ${this.currentBiomeConfig.displayName}`);
  }

  setupCollisions(): void {
    // Ground collisions
    utils.addCollider(this, this.player, this.groundPlatforms);
    utils.addCollider(this, this.enemies, this.groundPlatforms);

    // Player projectiles vs enemies
    utils.addOverlap(
      this,
      this.playerProjectiles,
      this.enemies,
      (projectile: any, enemy: any) => {
        if (projectile && enemy && projectile.active && enemy.active && !enemy.isDead) {
          enemy.takeDamage(projectile.damage);
          projectile.hit();
        }
      }
    );

    // Enemy projectiles vs player
    utils.addOverlap(
      this,
      this.enemyProjectiles,
      this.player,
      (projectile: any, player: any) => {
        if (projectile && player && projectile.active && player.active && !player.isInvulnerable) {
          player.takeDamage(projectile.damage);
          projectile.hit();
        }
      }
    );

    // Projectiles vs ground
    utils.addCollider(
      this,
      this.playerProjectiles,
      this.groundPlatforms,
      (projectile: any) => {
        if (projectile && projectile.active) {
          projectile.hit();
        }
      }
    );

    utils.addCollider(
      this,
      this.enemyProjectiles,
      this.groundPlatforms,
      (projectile: any) => {
        if (projectile && projectile.active) {
          projectile.hit();
        }
      }
    );
  }

  update(time: number, delta: number): void {
    // Update player
    if (this.player && this.player.active) {
      this.player.update(time, delta);
      
      // Update infinite scrolling background
      this.updateInfiniteBackground();
      
      // Generate more platforms ahead
      this.updateInfiniteGround();
    }

    // Update all enemies
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy && enemy.active && enemy.update) {
        enemy.update(time, delta);
        
        // Clean up enemies far behind player
        if (enemy.x < this.player.x - screenSize.width.value * 2) {
          enemy.destroy();
        }
      }
    });

    // Collect player projectiles for collision detection
    this.playerProjectiles.clear(false, false);
    if (this.player.projectiles) {
      this.player.projectiles.children.entries.forEach((projectile: any) => {
        if (projectile && projectile.active) {
          this.playerProjectiles.add(projectile);
        }
      });
    }

    // Handle test controls
    this.handleTestControls();

    // Update survival time
    this.updateSurvivalTime();

    // Handle player death
    this.handlePlayerDeath();

    // Collect enemy projectiles for global collision handling
    this.collectEnemyProjectiles();
    
    // Clean up dead enemies and award score
    this.cleanupDeadEnemies();
  }

  updateInfiniteBackground(): void {
    // Update tile sprite positions to create seamless scrolling
    this.backgrounds.forEach((bg, index) => {
      const scrollFactor = bg.scrollFactorX;
      bg.tilePositionX = this.cameras.main.scrollX * scrollFactor;
    });
  }

  updateInfiniteGround(): void {
    const playerX = this.player.x;
    const platformWidth = this.tileWidth * 8;
    
    // Generate new platforms ahead of player
    while (this.lastSpawnX < playerX + screenSize.width.value * 2) {
      const groundY = 17 * this.tileHeight;
      const platform = this.add.rectangle(this.lastSpawnX, groundY, platformWidth, this.tileHeight, 0x44aa44);
      this.groundPlatforms.add(platform);
      
      // Add some elevated platforms randomly
      if (Math.random() < 0.3) {
        const elevatedY = groundY - (this.tileHeight * (2 + Math.floor(Math.random() * 4)));
        const elevatedPlatform = this.add.rectangle(
          this.lastSpawnX + platformWidth / 2,
          elevatedY,
          platformWidth / 2,
          this.tileHeight,
          0x66cc66
        );
        this.groundPlatforms.add(elevatedPlatform);
      }
      
      this.lastSpawnX += platformWidth;
    }
    
    // Clean up platforms far behind player
    this.groundPlatforms.children.entries.forEach((platform: any) => {
      if (platform && platform.x < playerX - screenSize.width.value * 2) {
        this.groundPlatforms.remove(platform, true, true);
      }
    });
  }

  updateSurvivalTime(): void {
    if (!this.player.isDead) {
      const currentTime = Date.now();
      this.survivalTimeSeconds = Math.floor((currentTime - this.gameStartTime) / 1000);
    }
  }

  handlePlayerDeath(): void {
    // Check if player falls off screen
    if (this.player.y > this.mapHeight + 100 && !this.player.isDead) {
      this.player.health = 0;
      this.player.isDead = true;
    }

    // Check if player health is 0
    if (this.player.health <= 0 && !this.player.isDead) {
      this.player.isDead = true;
    }

    if (this.player.isDead && !this.gameCompleted) {
      this.gameCompleted = true;
      
      // Stop all timers
      if (this.enemySpawner) {
        this.enemySpawner.destroy();
      }
      if (this.survivalTimer) {
        this.survivalTimer.destroy();
      }

      // Show game over screen
      this.time.delayedCall(1000, () => {
        this.scene.launch("GameOverUIScene", {
          score: this.score,
          survivalTime: this.getFormattedSurvivalTime(),
          difficulty: this.difficulty
        });
      });

      console.log(`Game Over! Final Score: ${this.score}, Survival Time: ${this.getFormattedSurvivalTime()}`);
    }
  }

  collectEnemyProjectiles(): void {
    // Collect all enemy projectiles into the main group for collision detection
    this.enemyProjectiles.clear(false, false);
    
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy && enemy.active && enemy.enemyProjectiles) {
        enemy.enemyProjectiles.children.entries.forEach((projectile: any) => {
          if (projectile && projectile.active) {
            this.enemyProjectiles.add(projectile);
          }
        });
      }
    });
  }

  cleanupDeadEnemies(): void {
    const deadEnemies = this.enemies.children.entries.filter((enemy: any) => 
      enemy && enemy.isDead && enemy.active
    );

    deadEnemies.forEach((enemy: any) => {
      // Award score for killing enemy
      const scoreValue = enemy.getScoreValue();
      const multiplier = difficultyConfig[this.difficulty].value;
      this.addScore(scoreValue * multiplier);
      
      // Remove from scene
      this.time.delayedCall(500, () => {
        if (enemy && enemy.active) {
          enemy.destroy();
        }
      });
    });
  }

  addScore(points: number): void {
    this.score += points;
  }

  getScore(): number {
    return this.score;
  }

  getSurvivalTime(): number {
    return this.survivalTimeSeconds;
  }

  getFormattedSurvivalTime(): string {
    const minutes = Math.floor(this.survivalTimeSeconds / 60);
    const seconds = this.survivalTimeSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getCurrentBiomeName(): string {
    return this.currentBiomeConfig.displayName;
  }

  getBiomeTimeRemaining(): string {
    return this.biomeManager.getFormattedTimeRemaining();
  }

  getDifficulty(): string {
    return this.difficulty.toUpperCase();
  }

  setDifficulty(difficulty: "easy" | "hard" | "cursed"): void {
    this.difficulty = difficulty;
  }

  setupTestControls(): void {
    // Setup B key for manual biome cycling
    this.bKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
  }

  handleTestControls(): void {
    // Manual biome change with B key
    if (this.bKey && Phaser.Input.Keyboard.JustDown(this.bKey)) {
      this.forceBiomeChange();
    }
  }

  // Force biome change (for testing or manual trigger)
  forceBiomeChange(): void {
    if (!this.biomeTransitionInProgress) {
      this.biomeManager.forceNextBiome();
      this.triggerBiomeTransition();
    }
  }
}
