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
import { MobileControls } from "../MobileControls.js";

export class InfiniteSurvivalScene extends Phaser.Scene {
  // Scene properties
  public gameCompleted: boolean = false;
  public mapHeight: number = 0;
  
  // Game objects
  public player!: CommandoPlayer;
  public enemies!: Phaser.GameObjects.Group;
  public playerProjectiles!: Phaser.GameObjects.Group;
  private mobileControls?: MobileControls;
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
  public enemiesKilled: number = 0;
  public playMode: "guest" | "wallet" = "guest";
  public walletAddress: string | null = null;
  
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
  
  // Auto biome teleport timer (every 3 minutes)
  public biomeTeleportTimer?: Phaser.Time.TimerEvent;
  public teleportWarningText?: Phaser.GameObjects.Text;

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
    // Set play mode and wallet address
    if (data && data.playMode) {
      this.playMode = data.playMode;
    }
    if (data && data.walletAddress) {
      this.walletAddress = data.walletAddress;
    }
  }

  create(): void {
    // Check if Franklin mode is active
    const franklinMode = this.registry.get('franklinMode') || false;
    console.log(`Starting ${franklinMode ? 'FRANKLIN MODE' : 'Infinite Survival Mode'}! Difficulty: ${this.difficulty}`);
    
    // Initialize game state
    this.gameCompleted = false;
    this.score = 0;
    this.survivalTimeSeconds = 0;
    this.enemiesKilled = 0;
    this.gameStartTime = Date.now();
    this.biomeTransitionInProgress = false;

    // Initialize biome manager
    this.biomeManager = new BiomeManager(this);
    
    // If Franklin mode, lock to beach biome (force jungle config but use beach assets)
    if (franklinMode) {
      this.currentBiomeConfig = this.biomeManager.getCurrentBiome();
      // Override with beach visuals
      this.currentBiomeConfig.displayName = "Beach";
      this.currentBiomeConfig.backgroundKey = "beach_background";
      this.currentBiomeConfig.tilesKey = "beach_tileset";
      
      // Create Franklin animations
      this.createFranklinAnimations();
      
      // Store franklin mode flag for player/enemy creation
      (this as any).franklinMode = true;
    } else {
      this.currentBiomeConfig = this.biomeManager.getCurrentBiome();
      (this as any).franklinMode = false;
    }

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

    // Initialize mobile controls (will only show on mobile/tablet)
    this.mobileControls = new MobileControls(this);

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
    
    // Start auto biome teleport timer (every 3 minutes)
    this.startBiomeTeleportTimer();

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
    console.log(`[createInfiniteGround] Setting up STRAIGHT FLAT THICK platform for biome: ${this.currentBiomeConfig.displayName}`);
    console.log(`[createInfiniteGround] Using tileset: ${this.currentBiomeConfig.tilesetKey}`);
    
    // Create static group for platforms
    this.groundPlatforms = this.physics.add.staticGroup();
    
    const tileTexture = this.currentBiomeConfig.tilesetKey;
    const platformWidth = this.tileWidth * 15; // 960 pixels - VERY WIDE
    const platformHeight = this.tileHeight * 5; // 320 pixels - VERY THICK
    const groundLevel = 18 * this.tileHeight; // Fixed ground level
    
    console.log(`[createInfiniteGround] Creating CONTINUOUS FLAT platform - Width: ${platformWidth}, Height: ${platformHeight}`);
    
    // Create initial continuous platform - NO GAPS
    let currentX = -platformWidth; // Start offscreen to the left
    for (let i = 0; i < 30; i++) {
      const platform = this.add.tileSprite(
        currentX + platformWidth/2, 
        groundLevel, 
        platformWidth, 
        platformHeight, 
        tileTexture
      );
      platform.setOrigin(0.5, 0.5);
      this.groundPlatforms.add(platform, true);
      
      // EXACTLY touching - no gaps at all
      currentX += platformWidth;
    }
    
    this.lastSpawnX = currentX;
    console.log(`[createInfiniteGround] Created continuous flat platform up to X=${this.lastSpawnX}`);
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
  
  startBiomeTeleportTimer(): void {
    // Auto biome change every 3 minutes (180 seconds)
    // Countdown starts at 2:50 (170 seconds) - 10 seconds before teleport
    this.biomeTeleportTimer = this.time.addEvent({
      delay: 170000, // 2 minutes 50 seconds (170 seconds)
      callback: () => {
        this.showTeleportWarning(); // Shows 10-second countdown
      },
      loop: true
    });
    
    console.log("Auto biome teleport timer started - countdown begins at 2:50 (every 3 minutes)");
  }
  
  showTeleportWarning(): void {
    // Show countdown from 10 seconds
    let countdown = 10;
    
    if (this.teleportWarningText) {
      this.teleportWarningText.destroy();
    }
    
    // Create countdown text (75% smaller = 25% of original size)
    this.teleportWarningText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 200,
      `Teleporting in ${countdown}`,
      {
        fontSize: '18px',
        color: '#ffff00',
        fontFamily: 'Arial Black',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    this.teleportWarningText.setOrigin(0.5);
    this.teleportWarningText.setScrollFactor(0);
    this.teleportWarningText.setDepth(10000);
    
    // Countdown timer - update every second
    const countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        countdown--;
        
        if (countdown > 0 && this.teleportWarningText) {
          this.teleportWarningText.setText(`Teleporting in ${countdown}`);
          
          // Flash red when countdown gets low
          if (countdown <= 3) {
            this.teleportWarningText.setColor('#ff0000');
            this.tweens.add({
              targets: this.teleportWarningText,
              scale: 1.3,
              duration: 200,
              yoyo: true
            });
          }
        } else if (countdown === 0) {
          // Teleport NOW!
          if (this.teleportWarningText) {
            this.teleportWarningText.destroy();
          }
          this.forceBiomeChange();
          countdownTimer.destroy();
        }
      },
      repeat: 9 // 10 total ticks (10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
    });
  }

  startEnemySpawning(): void {
    // Difficulty-based enemy spawning
    let spawnDelay: number;
    let maxEnemies: number;
    
    switch(this.difficulty) {
      case "easy":
        spawnDelay = 2500; // Moderate spawns
        maxEnemies = 6; // Few enemies, shoot straight
        break;
      case "hard":
        spawnDelay = 1200; // Faster spawns
        maxEnemies = 12; // More enemies, aim at player
        break;
      case "cursed":
        spawnDelay = 400; // EVERYWHERE spawns!
        maxEnemies = 25; // Tons of enemies, aim at player
        break;
      default:
        spawnDelay = 2000;
        maxEnemies = 8;
    }
    
    // Apply biome difficulty multiplier
    const biomeDifficultyMultiplier = this.biomeManager.getDifficultyMultiplier();
    const adjustedSpawnDelay = Math.max(300, spawnDelay / biomeDifficultyMultiplier);
    
    console.log(`Enemy spawning: Difficulty=${this.difficulty}, Spawn delay=${adjustedSpawnDelay}ms, Max enemies=${maxEnemies}`);

    // Spawn initial wave
    const initialWave = this.difficulty === "cursed" ? 5 : this.difficulty === "hard" ? 3 : 2;
    for (let i = 0; i < initialWave; i++) {
      setTimeout(() => this.spawnEnemy(), i * 300);
    }

    // Then continue spawning
    this.enemySpawner = this.time.addEvent({
      delay: adjustedSpawnDelay,
      callback: () => {
        this.spawnEnemy();
      },
      loop: true
    });
  }

  spawnEnemy(): void {
    // Get max enemies based on difficulty
    let maxEnemies: number;
    switch(this.difficulty) {
      case "easy": maxEnemies = 6; break;
      case "hard": maxEnemies = 12; break;
      case "cursed": maxEnemies = 25; break;
      default: maxEnemies = 8;
    }
    
    // Add biome difficulty
    maxEnemies += Math.floor(this.biomeManager.getDifficultyMultiplier());
    
    const activeEnemies = this.enemies.children.entries.filter(enemy => enemy.active).length;
    
    if (activeEnemies >= maxEnemies) {
      return;
    }

    // PROFESSIONAL ENEMY PLACEMENT: Only spawn ON visible platforms
    const playerX = this.player.x;
    
    // Get platforms ahead of player (visible on screen)
    const platforms = this.groundPlatforms.getChildren().filter((platform: any) => {
      return platform.active && 
             platform.x > playerX + 300 && 
             platform.x < playerX + screenSize.width.value * 1.2;
    });
    
    if (platforms.length === 0) return;
    
    // Choose random platform that's not too small
    const validPlatforms = platforms.filter((p: any) => p.displayWidth > 200);
    if (validPlatforms.length === 0) return;
    
    const platform: any = Phaser.Utils.Array.GetRandom(validPlatforms);
    
    // Spawn enemy ON TOP of platform (standing, not floating)
    const spawnX = platform.x + Phaser.Math.Between(-50, 50);
    const spawnY = platform.y - (platform.displayHeight/2) - 40; // Just above platform surface
    
    const enemy = this.createEnemyForCurrentBiome(spawnX, spawnY);
    if (enemy) {
      this.enemies.add(enemy);
    }
  }

  createEnemyForCurrentBiome(x: number, y: number): any {
    const currentBiome = this.biomeManager.getCurrentBiome();
    const enemyType = Phaser.Utils.Array.GetRandom(currentBiome.enemyTypes);
    
    let enemy: any;
    
    // In Franklin mode, always spawn Narcos enemies
    const franklinMode = (this as any).franklinMode || false;
    if (franklinMode) {
      enemy = new JungleEnemy(this, x, y);  // Use JungleEnemy as base
      // Override animations to use Narcos
      enemy.idleAnimKey = 'narco_idle_anim';
      enemy.walkAnimKey = 'narco_walk_anim';
      enemy.shootAnimKey = 'narco_attack_anim';
      enemy.dieAnimKey = 'narco_die_anim';
      // Update sprite texture
      enemy.setTexture('narco_idle_1');
    } else {
      // Normal mode - spawn based on biome
      switch (enemyType) {
        case "jungle_soldier":
          enemy = new JungleEnemy(this, x, y);
          break;
        case "desert_trooper":
          enemy = new DesertEnemy(this, x, y);
          break;
        case "urban_sniper":
          enemy = new UrbanEnemy(this, x, y);
          break;
        case "arctic_soldier":
          enemy = new ArcticEnemy(this, x, y);
          break;
        case "space_cyborg":
          enemy = new SpaceEnemy(this, x, y);
          break;
        default:
          enemy = new JungleEnemy(this, x, y);
      }
    }
    
    // Scale enemy health based on difficulty
    if (enemy) {
      switch(this.difficulty) {
        case "easy":
          enemy.maxHealth = 50; // Normal
          enemy.health = 50;
          break;
        case "hard":
          enemy.maxHealth = 80; // 60% more health
          enemy.health = 80;
          break;
        case "cursed":
          enemy.maxHealth = 120; // 140% more health
          enemy.health = 120;
          break;
      }
    }
    
    return enemy;
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

    // 2. CLEAR AND REGENERATE FLAT THICK PLATFORMS
    console.log("Clearing old platforms and creating FLAT THICK continuous platform...");
    const playerX = this.player.x;
    const platformWidth = this.tileWidth * 15; // SAME as createInfiniteGround
    const platformHeight = this.tileHeight * 5; // SAME as createInfiniteGround
    const groundLevel = 18 * this.tileHeight; // SAME as createInfiniteGround
    
    // CLEAR ALL OLD PLATFORMS
    this.groundPlatforms.clear(true, true);
    console.log("All old platforms cleared");
    
    // CREATE CONTINUOUS FLAT PLATFORM under and around player - NO SKY PLATFORMS!
    const startX = playerX - (platformWidth * 3); // 3 platforms behind
    let currentX = startX;
    
    for (let i = 0; i < 10; i++) {
      const platform = this.add.tileSprite(
        currentX + platformWidth/2,
        groundLevel,
        platformWidth,
        platformHeight,
        this.currentBiomeConfig.tilesetKey
      );
      platform.setOrigin(0.5, 0.5);
      this.groundPlatforms.add(platform, true);
      
      currentX += platformWidth; // NO GAPS
    }
    
    console.log(`Emergency FLAT platforms created with ${this.currentBiomeConfig.tilesetKey}`);
    
    // Set spawn point ahead for continuous generation
    this.lastSpawnX = currentX;
    
    // Generate more platforms immediately
    console.log(`Generating continuous FLAT platforms with tileset: ${this.currentBiomeConfig.tilesetKey}`);
    this.updateInfiniteGround();

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
    // Ground collisions - with dynamically generated platforms only
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
    // Handle weapon switch from mobile controls
    if (this.mobileControls && this.player && this.player.active && this.mobileControls.switchWeapon) {
      this.player.switchWeapon("next");
      this.mobileControls.switchWeapon = false; // Reset flag
    }

    // Update player (FSM will handle mobile controls for movement, jump, and shooting)
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
    const platformWidth = this.tileWidth * 15; // 960 pixels - VERY WIDE
    const platformHeight = this.tileHeight * 5; // 320 pixels - VERY THICK
    const groundLevel = 18 * this.tileHeight; // Same as createInfiniteGround
    
    // Generate CONTINUOUS FLAT platform ahead of player
    while (this.lastSpawnX < playerX + screenSize.width.value * 3) {
      
      const platform = this.add.tileSprite(
        this.lastSpawnX + platformWidth/2,
        groundLevel,
        platformWidth,
        platformHeight,
        tileTexture
      );
      platform.setOrigin(0.5, 0.5);
      this.groundPlatforms.add(platform, true);
      
      // EXACTLY touching - absolutely NO gaps
      this.lastSpawnX += platformWidth;
    }
    
    // Clean up platforms far behind player
    this.groundPlatforms.children.entries.forEach((platform: any) => {
      if (platform && platform.x < playerX - screenSize.width.value * 3) {
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
        console.log(`[Game Over] Passing data to GameOverUIScene:`);
        console.log(`  - Score: ${this.score}`);
        console.log(`  - Survival Time: ${this.survivalTimeSeconds}s`);
        console.log(`  - Enemies Killed: ${this.enemiesKilled}`);
        console.log(`  - Play Mode: ${this.playMode}`);
        console.log(`  - Wallet: ${this.walletAddress}`);
        
        this.scene.launch("GameOverUIScene", {
          score: this.score,
          survivalTime: this.getFormattedSurvivalTime(),
          survivalTimeSeconds: this.survivalTimeSeconds,
          enemiesKilled: this.enemiesKilled,
          biomeReached: this.getCurrentBiomeName(),
          difficulty: this.difficulty,
          playMode: this.playMode,
          walletAddress: this.walletAddress
        });
      });

      console.log(`Game Over! Final Score: ${this.score}, Survival Time: ${this.getFormattedSurvivalTime()}, Enemies Killed: ${this.enemiesKilled}`);
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
      
      // Increment enemies killed counter
      this.enemiesKilled++;
      
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
    console.log(`[Score] Added ${points} points. Total score: ${this.score}`);
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


  /**
   * Create Franklin mode animations
   */
  createFranklinAnimations(): void {
    console.log('[Franklin] Creating Franklin animations');
    
    // Franklin player animations
    this.anims.create({
      key: 'franklin_idle_anim',
      frames: [
        { key: 'franklin_idle_1' },
        { key: 'franklin_idle_2' }
      ],
      frameRate: 8,
      repeat: -1
    });
    
    this.anims.create({
      key: 'franklin_walk_anim',
      frames: [
        { key: 'franklin_walk_1' },
        { key: 'franklin_walk_2' }
      ],
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'franklin_jump_up_anim',
      frames: [{ key: 'franklin_jump_1' }],
      frameRate: 10,
      repeat: 0
    });
    
    this.anims.create({
      key: 'franklin_jump_down_anim',
      frames: [{ key: 'franklin_jump_2' }],
      frameRate: 10,
      repeat: 0
    });
    
    this.anims.create({
      key: 'franklin_slingshot_anim',
      frames: [
        { key: 'franklin_slingshot_1' },
        { key: 'franklin_slingshot_2' }
      ],
      frameRate: 10,
      repeat: 0
    });
    
    this.anims.create({
      key: 'franklin_rifle_anim',
      frames: [
        { key: 'franklin_rifle_1' },
        { key: 'franklin_rifle_2' }
      ],
      frameRate: 10,
      repeat: 0
    });
    
    this.anims.create({
      key: 'franklin_flamethrower_anim',
      frames: [
        { key: 'franklin_flamethrower_1' },
        { key: 'franklin_flamethrower_2' }
      ],
      frameRate: 10,
      repeat: 0
    });
    
    this.anims.create({
      key: 'franklin_die_anim',
      frames: [
        { key: 'franklin_die_1' },
        { key: 'franklin_die_2' }
      ],
      frameRate: 8,
      repeat: 0
    });
    
    // Narcos enemy animations
    this.anims.create({
      key: 'narco_idle_anim',
      frames: [
        { key: 'narco_idle_1' },
        { key: 'narco_idle_2' }
      ],
      frameRate: 6,
      repeat: -1
    });
    
    this.anims.create({
      key: 'narco_walk_anim',
      frames: [
        { key: 'narco_walk_1' },
        { key: 'narco_walk_2' }
      ],
      frameRate: 8,
      repeat: -1
    });
    
    this.anims.create({
      key: 'narco_attack_anim',
      frames: [
        { key: 'narco_attack_1' },
        { key: 'narco_attack_2' }
      ],
      frameRate: 10,
      repeat: 0
    });
    
    this.anims.create({
      key: 'narco_die_anim',
      frames: [
        { key: 'narco_die_1' },
        { key: 'narco_die_2' }
      ],
      frameRate: 8,
      repeat: 0
    });
    
    console.log('[Franklin] All animations created');
  }

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
