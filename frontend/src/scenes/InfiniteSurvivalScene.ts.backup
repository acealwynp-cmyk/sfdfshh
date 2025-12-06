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
  public mapWidth: number = 0;
  public mapHeight: number = 0;
  
  // Game objects
  public player!: CommandoPlayer;
  public enemies!: Phaser.GameObjects.Group;
  public playerProjectiles!: Phaser.GameObjects.Group;
  public enemyProjectiles!: Phaser.GameObjects.Group;
  
  // Map objects
  public map!: Phaser.Tilemaps.Tilemap;
  public groundTileset!: Phaser.Tilemaps.Tileset;
  public groundLayer!: Phaser.Tilemaps.TilemapLayer;
  
  // Background
  public backgrounds!: Phaser.GameObjects.Image[];

  // Game state
  public score: number = 0;
  public difficulty: "easy" | "hard" | "cursed" = "easy";
  public survivalTimeSeconds: number = 0;
  public gameStartTime: number = 0;
  
  // Enemy spawning
  public enemySpawner?: Phaser.Time.TimerEvent;
  public spawnPoints: { x: number; y: number }[] = [];

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

    // Set map size (50x20 tiles, each tile is 64x64)
    this.mapWidth = 50 * 64;
    this.mapHeight = 20 * 64;

    // Create initial biome
    this.setupCurrentBiome();

    // Create game object groups
    this.enemies = this.add.group();
    this.playerProjectiles = this.add.group();
    this.enemyProjectiles = this.add.group();

    // Create player
    this.createPlayer();

    // Setup spawn points for enemies
    this.setupSpawnPoints();

    // Set camera
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setLerp(0.1, 0.1);

    // Set world boundaries (disable bottom boundary for falling death)
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight, true, true, true, false);

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

    console.log(`Started in biome: ${this.currentBiomeConfig.displayName}`);
  }

  setupCurrentBiome(): void {
    // Create background for current biome
    this.createBackground();

    // Create map for current biome
    this.createTileMap();

    // Play biome-specific music
    this.playBiomeMusic();
  }

  createBackground(): void {
    // Destroy existing backgrounds
    if (this.backgrounds) {
      this.backgrounds.forEach(bg => bg.destroy());
    }
    
    this.backgrounds = [];
    
    // Calculate how many background images we need to cover the map width
    const bgWidth = 1536; // Background image width
    const bgHeight = 1024; // Background image height
    
    // Calculate scale to match map height
    const scale = this.mapHeight / bgHeight;
    const scaledBgWidth = bgWidth * scale;
    
    // Calculate number of backgrounds needed
    const numBackgrounds = Math.ceil(this.mapWidth / scaledBgWidth);
    
    for (let i = 0; i < numBackgrounds; i++) {
      const bg = this.add.image(
        i * scaledBgWidth + (scaledBgWidth / 2),
        this.mapHeight / 2,
        this.currentBiomeConfig.backgroundKey
      );
      
      utils.initScale(bg, { x: 0.5, y: 0.5 }, scaledBgWidth, this.mapHeight);
      bg.setScrollFactor(0.2); // Parallax scrolling
      bg.setDepth(-10); // Behind everything
      
      this.backgrounds.push(bg);
    }
  }

  createTileMap(): void {
    // Destroy existing map if it exists
    if (this.map) {
      this.map.destroy();
    }

    // Load tilemap for current biome
    this.map = this.make.tilemap({ key: this.currentBiomeConfig.tilemapKey });
    this.groundTileset = this.map.addTilesetImage(this.currentBiomeConfig.tilesetKey, this.currentBiomeConfig.tilesetKey);

    // Create ground layer
    this.groundLayer = this.map.createLayer("ground_layer", this.groundTileset, 0, 0)!;
    
    // Set collisions - exclude empty tiles (index -1)
    this.groundLayer.setCollisionByExclusion([-1]);
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
    // Spawn player at the start of the level
    const spawnX = 200;
    const spawnY = 15 * 64; // On the main ground platform
    
    this.player = new CommandoPlayer(this, spawnX, spawnY);
  }

  setupSpawnPoints(): void {
    // Define enemy spawn points based on map structure
    // These work for all biome maps since they have similar layouts
    this.spawnPoints = [
      { x: 800, y: 12 * 64 }, // Elevated platform 1
      { x: 1600, y: 10 * 64 }, // Elevated platform 2
      { x: 2300, y: 13 * 64 }, // Elevated platform 3
      { x: 2800, y: 17 * 64 }, // Final ground section
      { x: 1300, y: 8 * 64 }, // Small floating platform 1
      { x: 1900, y: 7 * 64 }, // Small floating platform 2
      { x: 2900, y: 10 * 64 }, // High platform
    ];
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

    // Choose random spawn point
    const spawnPoint = Phaser.Utils.Array.GetRandom(this.spawnPoints);
    
    // Make sure spawn point is off-screen
    const camera = this.cameras.main;
    if (spawnPoint.x > camera.scrollX - 100 && spawnPoint.x < camera.scrollX + camera.width + 100) {
      // Try to spawn further ahead or behind
      const playerX = this.player.x;
      const forwardSpawn = this.spawnPoints.find(p => p.x > playerX + camera.width);
      const backwardSpawn = this.spawnPoints.find(p => p.x < playerX - 200);
      
      const chosenSpawn = forwardSpawn || backwardSpawn;
      if (!chosenSpawn) return;
      
      const enemy = this.createEnemyForCurrentBiome(chosenSpawn.x, chosenSpawn.y);
      if (enemy) {
        this.enemies.add(enemy);
      }
    } else {
      const enemy = this.createEnemyForCurrentBiome(spawnPoint.x, spawnPoint.y);
      if (enemy) {
        this.enemies.add(enemy);
      }
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
    
    // Clear all existing enemies
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy && enemy.active) {
        enemy.destroy();
      }
    });
    this.enemies.clear(true, true);

    // Clear all projectiles
    this.playerProjectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);

    // Setup new biome
    this.setupCurrentBiome();

    // Restart enemy spawning with new difficulty
    if (this.enemySpawner) {
      this.enemySpawner.destroy();
    }
    this.startEnemySpawning();

    // Setup collisions again for new map
    this.setupCollisions();

    this.biomeTransitionInProgress = false;
    
    console.log(`Successfully transitioned to: ${this.currentBiomeConfig.displayName}`);
  }

  setupCollisions(): void {
    // Clear existing colliders first (remove all existing colliders)
    this.physics.world.colliders.removeAll();

    // Ground collisions
    utils.addCollider(this, this.player, this.groundLayer);
    utils.addCollider(this, this.enemies, this.groundLayer);

    // Player projectiles vs enemies
    utils.addOverlap(
      this,
      this.playerProjectiles,
      this.enemies,
      (projectile: any, enemy: any) => {
        if (projectile && enemy && projectile.active && enemy.active) {
          // Add score when enemy is hit
          const scoreGain = Math.floor(projectile.damage * 2);
          this.addScore(scoreGain);
          
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
      this.groundLayer,
      (projectile: any) => {
        if (projectile && projectile.active) {
          projectile.hit();
        }
      }
    );

    utils.addCollider(
      this,
      this.enemyProjectiles,
      this.groundLayer,
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
    }

    // Update all enemies
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy && enemy.active && enemy.update) {
        enemy.update(time, delta);
      }
    });

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

  updateSurvivalTime(): void {
    if (!this.player.isDead) {
      const currentTime = Date.now();
      this.survivalTimeSeconds = Math.floor((currentTime - this.gameStartTime) / 1000);
    }
  }

  handlePlayerDeath(): void {
    if (this.player.isDead && !this.gameCompleted) {
      this.gameCompleted = true;
      
      // Stop all timers
      if (this.enemySpawner) {
        this.enemySpawner.destroy();
      }
      if (this.survivalTimer) {
        this.survivalTimer.destroy();
      }

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
      this.addScore(enemy.getScoreValue());
      
      // Remove from scene
      enemy.destroy();
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
      this.triggerBiomeTransition();
    }
  }
}