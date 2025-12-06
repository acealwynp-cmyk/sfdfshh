import Phaser from "phaser";
import * as utils from "../utils";
import { CommandoPlayer } from "../CommandoPlayer";
import { JungleEnemy } from "../JungleEnemy";
import { DesertEnemy } from "../DesertEnemy";
import { UrbanEnemy } from "../UrbanEnemy";
import { ArcticEnemy } from "../ArcticEnemy";
import { SpaceEnemy } from "../SpaceEnemy";
import { BiomeManager, BiomeType } from "../BiomeManager";
import type { BiomeConfig } from "../BiomeManager";
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
  
  // Tilemap system
  public map!: Phaser.Tilemaps.Tilemap;
  public groundLayer!: Phaser.Tilemaps.TilemapLayer;
  public groundTileset!: Phaser.Tilemaps.Tileset;
  
  // Background
  public backgrounds!: Phaser.GameObjects.TileSprite[];
  
  // Last platform Y position for continuity
  public lastPlatformY: number = 17 * 64;

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

  init(data: any): void {
    // Set difficulty from title screen
    if (data && data.difficulty) {
      this.difficulty = data.difficulty;
    }
  }

  create(): void {
    console.log(`Starting Infinite Survival Mode! Difficulty: ${this.difficulty}`);
    
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
    
    const textureKey = this.currentBiomeConfig.backgroundKey;
    console.log(`[createInfiniteBackground] Using texture key: ${textureKey}`);
    console.log(`[createInfiniteBackground] Current biome: ${this.currentBiomeConfig.displayName}`);
    
    // Ensure texture is loaded before using it
    if (!this.textures.exists(textureKey)) {
      console.error(`ERROR: Texture ${textureKey} not found!`);
      return;
    }
    
    // Force texture cache refresh by getting fresh texture reference
    const texture = this.textures.get(textureKey);
    console.log(`[createInfiniteBackground] Texture loaded: ${texture.key}, frames: ${texture.frameTotal}`);
    
    // Create multiple layers of parallax scrolling tile sprites
    const bgWidth = screenSize.width.value * 3; // Wide enough for seamless tiling
    
    // Layer 1 - Far background (slower parallax)
    const bg1 = this.add.tileSprite(
      0,
      this.mapHeight / 2,
      bgWidth,
      this.mapHeight,
      textureKey
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
      textureKey
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
      textureKey
    );
    bg3.setOrigin(0, 0.5);
    bg3.setScrollFactor(0.5);
    bg3.setDepth(-10);
    bg3.setAlpha(0.5);
    this.backgrounds.push(bg3);
  }

  createInfiniteGround(): void {
    // Create tilemap for current biome using actual tile assets
    this.map = this.make.tilemap({ key: this.currentBiomeConfig.tilemapKey });
    this.groundTileset = this.map.addTilesetImage(this.currentBiomeConfig.tilesetKey, this.currentBiomeConfig.tilesetKey);

    // Create ground layer from tilemap
    this.groundLayer = this.map.createLayer("ground_layer", this.groundTileset, 0, 0)!;
    
    // Set collisions - exclude empty tiles (index -1)
    this.groundLayer.setCollisionByExclusion([-1]);

    // Create static group for additional platforms
    this.groundPlatforms = this.physics.add.staticGroup();
    
    // Get map width
    const mapWidth = this.map.widthInPixels;
    this.lastSpawnX = mapWidth;
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
    const maxEnemies = Math.min(15, enemyConfig.maxEnemies.value + Math.floor(this.biomeManager.getDifficultyMultiplier()));
    
    if (activeEnemies >= maxEnemies) {
      return;
    }

    // Spawn enemy ahead of player on platforms
    const playerX = this.player.x;
    
    // Get platforms ahead of player
    const platforms = this.groundPlatforms.getChildren().filter((platform: any) => {
      return platform.x > playerX + 200 && platform.x < playerX + screenSize.width.value * 1.5;
    });
    
    if (platforms.length === 0) return;
    
    // Choose random platform
    const platform: any = Phaser.Utils.Array.GetRandom(platforms);
    
    // Spawn enemy on platform
    const spawnX = platform.x + Phaser.Math.Between(-100, 100);
    const spawnY = platform.y - this.tileHeight * 2; // Above platform
    
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
    
    // Change biome immediately
    this.biomeManager.forceNextBiome();
    this.currentBiomeConfig = this.biomeManager.getCurrentBiome();
    
    // Show transition effect
    this.cameras.main.flash(1500, 255, 255, 255);
    
    // Transition to new biome after flash effect
    this.time.delayedCall(800, () => {
      this.transitionToNewBiome();
    });
  }

  transitionToNewBiome(): void {
    console.log(`=== BIOME TRANSITION START ===`);
    console.log(`New Biome: ${this.currentBiomeConfig.displayName}`);
    console.log(`Background: ${this.currentBiomeConfig.backgroundKey}`);
    console.log(`Tilemap: ${this.currentBiomeConfig.tilemapKey}`);
    console.log(`Tileset: ${this.currentBiomeConfig.tilesetKey}`);
    console.log(`Enemies: ${this.currentBiomeConfig.enemyTypes}`);
    
    // Clear all existing enemies
    this.enemies.getChildren().forEach((enemy: any) => {
      if (enemy && enemy.active) {
        enemy.destroy();
      }
    });
    this.enemies.clear(true, true);

    // Clear all projectiles
    this.playerProjectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    
    // 1. UPDATE BACKGROUNDS - Recreate them with new texture
    console.log("Updating backgrounds...");
    const newBackgroundKey = this.currentBiomeConfig.backgroundKey;
    console.log(`  -> Recreating backgrounds with texture: ${newBackgroundKey}`);
    
    // Destroy old backgrounds
    this.backgrounds.forEach(bg => bg.destroy());
    this.backgrounds = [];
    
    // Recreate backgrounds with new texture
    this.createInfiniteBackground();

    // 2. DESTROY OLD TILEMAP
    console.log("Destroying old tilemap...");
    if (this.groundLayer) {
      this.groundLayer.destroy();
      this.groundLayer = null as any;
    }
    if (this.map) {
      this.map.destroy();
      this.map = null as any;
    }
    
    // 3. PLATFORM TRANSITION STRATEGY
    // Keep on-screen platforms, clear off-screen ones, new platforms use new tileset
    console.log("Transitioning platform tiles...");
    const playerX = this.player.x;
    const platforms = this.groundPlatforms.getChildren();
    
    // Remove platforms that are off-screen (behind or far ahead)
    platforms.forEach((platform: any) => {
      if (platform && (platform.x < playerX - screenSize.width.value || platform.x > playerX + screenSize.width.value * 2)) {
        this.groundPlatforms.remove(platform, true, true);
      }
    });
    
    // Force immediate generation of new platforms ahead with the new tileset
    this.updateInfiniteGround();
    
    console.log(`Platform transition complete. New platforms will use: ${this.currentBiomeConfig.tilesetKey}`);
    
    // 4. CREATE NEW TILEMAP FOR NEW BIOME
    console.log("Creating new tilemap...");
    try {
      this.map = this.make.tilemap({ key: this.currentBiomeConfig.tilemapKey });
      this.groundTileset = this.map.addTilesetImage(
        this.currentBiomeConfig.tilesetKey, 
        this.currentBiomeConfig.tilesetKey
      );
      this.groundLayer = this.map.createLayer("ground_layer", this.groundTileset, 0, 0)!;
      this.groundLayer.setCollisionByExclusion([-1]);
      console.log("New tilemap created successfully!");
    } catch (error) {
      console.error("Error creating tilemap:", error);
    }
    
    // 5. RE-SETUP COLLISIONS
    console.log("Setting up collisions...");
    if (this.groundLayer) {
      utils.addCollider(this, this.player, this.groundLayer);
      utils.addCollider(this, this.enemies, this.groundLayer);
      
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

    // 6. PLAY NEW BIOME MUSIC
    console.log("Playing new music...");
    this.playBiomeMusic();

    // 7. RESTART ENEMY SPAWNING WITH NEW ENEMY TYPES
    console.log("Restarting enemy spawning...");
    if (this.enemySpawner) {
      this.enemySpawner.destroy();
    }
    this.startEnemySpawning();

    this.biomeTransitionInProgress = false;
    
    console.log(`=== BIOME TRANSITION COMPLETE ===`);
    console.log(`New platforms ahead will use ${this.currentBiomeConfig.tilesetKey}, old ones will scroll off-screen naturally`);
  }

  setupCollisions(): void {
    // Ground collisions - with main tilemap layer
    utils.addCollider(this, this.player, this.groundLayer);
    utils.addCollider(this, this.enemies, this.groundLayer);
    
    // Also collide with additional platforms
    utils.addCollider(this, this.player, this.groundPlatforms);
    utils.addCollider(this, this.enemies, this.groundPlatforms);

    // Player projectiles vs enemies
    utils.addOverlap(
      this,
      this.playerProjectiles,
      this.enemies,
      (projectile: any, enemy: any) => {
        if (projectile && enemy && projectile.active && enemy.active && !enemy.isDead) {
          // Direct hit damage
          enemy.takeDamage(projectile.damage);
          
          // Trigger explosion for rockets
          if (projectile.isRocket) {
            projectile.createExplosion(this, projectile.x, projectile.y, projectile.damage);
          }
          
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

    // Projectiles vs ground tilemap
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
    
    // Projectiles vs ground platforms
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

    // Update all enemies (even those far away)
    this.enemies.getChildren().forEach((enemy: any) => {
      if (enemy && enemy.active && enemy.update) {
        enemy.update(time, delta);
        
        // Clean up enemies very far behind player
        if (enemy.x < this.player.x - screenSize.width.value * 3) {
          enemy.destroy();
        }
      }
    });

    // Collect player projectiles for collision detection (all of them, not just nearby)
    this.playerProjectiles.clear(false, false);
    if (this.player.projectiles) {
      this.player.projectiles.getChildren().forEach((projectile: any) => {
        if (projectile && projectile.active) {
          this.playerProjectiles.add(projectile);
          // Update projectile
          if (projectile.update) {
            projectile.update();
          }
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
    const tileTexture = this.currentBiomeConfig.tilesetKey;
    const platformWidth = this.tileWidth * 12; // THICKER platforms (12 tiles wide)
    const platformHeight = this.tileHeight * 3; // THICKER platforms (3 tiles tall)
    
    console.log(`[updateInfiniteGround] Creating platforms with tileset: ${tileTexture}`);
    
    // Generate new platforms ahead of player
    while (this.lastSpawnX < playerX + screenSize.width.value * 3) {
      // Get the last platform Y position for continuity
      const platforms = this.groundPlatforms.getChildren();
      let lastY = 15 * this.tileHeight; // Default mid-level
      
      if (platforms.length > 0) {
        const lastPlatform: any = platforms[platforms.length - 1];
        lastY = lastPlatform.y;
      }
      
      // Calculate next platform position (varied heights)
      let nextY = lastY;
      const heightVariation = Phaser.Math.Between(-2, 2); // Vary height
      const maxJumpHeight = 4; // Player can jump up to 4 tiles
      
      // Apply height change if it's jumpable
      if (Math.abs(heightVariation) <= maxJumpHeight) {
        nextY += heightVariation * this.tileHeight;
      }
      
      // Clamp Y to playable range
      nextY = Phaser.Math.Clamp(nextY, 8 * this.tileHeight, 17 * this.tileHeight);
      
      // Create thick platform with appropriate gap (always jumpable)
      const gap = Phaser.Math.Between(120, 250);
      const nextX = this.lastSpawnX + gap;
      
      // Create THICK platform using biome tileset
      const platform = this.add.image(nextX + platformWidth/2, nextY, tileTexture);
      console.log(`[PLATFORM] Creating at ${nextX}, requested texture: "${tileTexture}", actual texture: "${platform.texture.key}"`);
      platform.setDisplaySize(platformWidth, platformHeight);
      platform.setOrigin(0.5, 0.5);
      this.groundPlatforms.add(platform, true);
      
      // Sometimes add elevated platforms for variety
      if (Math.random() < 0.3 && nextY > 12 * this.tileHeight) {
        const elevatedY = nextY - (this.tileHeight * Phaser.Math.Between(3, 5));
        const elevatedPlatform = this.add.image(
          nextX + platformWidth/2 + Phaser.Math.Between(100, 200),
          elevatedY,
          tileTexture
        );
        elevatedPlatform.setDisplaySize(platformWidth * 0.7, platformHeight);
        elevatedPlatform.setOrigin(0.5, 0.5);
        this.groundPlatforms.add(elevatedPlatform, true);
      }
      
      this.lastSpawnX = nextX + platformWidth;
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
    
    this.enemies.getChildren().forEach((enemy: any) => {
      if (enemy && enemy.active && enemy.enemyProjectiles) {
        enemy.enemyProjectiles.getChildren().forEach((projectile: any) => {
          if (projectile && projectile.active) {
            this.enemyProjectiles.add(projectile);
            // Update enemy projectile
            if (projectile.update) {
              projectile.update();
            }
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
    console.log(`Force biome change called. InProgress: ${this.biomeTransitionInProgress}`);
    if (!this.biomeTransitionInProgress) {
      // Don't call forceNextBiome() here - triggerBiomeTransition() will do it
      this.triggerBiomeTransition();
    } else {
      console.log("Transition already in progress, skipping...");
    }
  }
}
