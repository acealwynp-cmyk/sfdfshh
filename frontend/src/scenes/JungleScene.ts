import Phaser from "phaser";
import * as utils from "../utils";
import { CommandoPlayer } from "../CommandoPlayer";
import { JungleEnemy } from "../JungleEnemy";
import { screenSize, enemyConfig, difficultyConfig } from "../gameConfig.json";

export class JungleScene extends Phaser.Scene {
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
  
  // Enemy spawning
  public enemySpawner?: Phaser.Time.TimerEvent;
  public spawnPoints: { x: number; y: number }[] = [];

  // Background music
  public backgroundMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super({
      key: "JungleScene",
    });
  }

  create(): void {
    // Initialize game state
    this.gameCompleted = false;
    this.score = 0;

    // Set map size (50x20 tiles, each tile is 64x64)
    this.mapWidth = 50 * 64;
    this.mapHeight = 20 * 64;

    // Create background
    this.createBackground();

    // Create map
    this.createTileMap();

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

    // Show UI
    this.scene.launch("UIScene", { gameSceneKey: this.scene.key });

    // Play background music
    this.backgroundMusic = this.sound.add("jungle_battle_theme", {
      volume: 0.6,
      loop: true
    });
    this.backgroundMusic.play();
  }

  createBackground(): void {
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
        "jungle_background"
      );
      
      utils.initScale(bg, { x: 0.5, y: 0.5 }, scaledBgWidth, this.mapHeight);
      bg.setScrollFactor(0.2); // Parallax scrolling
      bg.setDepth(-10); // Behind everything
      
      this.backgrounds.push(bg);
    }
  }

  createTileMap(): void {
    // Load tilemap
    this.map = this.make.tilemap({ key: "jungle_level_1" });
    this.groundTileset = this.map.addTilesetImage("jungle_ground_tileset", "jungle_ground_tileset");

    // Create ground layer
    this.groundLayer = this.map.createLayer("ground_layer", this.groundTileset, 0, 0)!;
    
    // Set collisions - exclude empty tiles (index -1)
    this.groundLayer.setCollisionByExclusion([-1]);
  }

  createPlayer(): void {
    // Spawn player at the start of the level
    const spawnX = 200;
    const spawnY = 15 * 64; // On the main ground platform
    
    this.player = new CommandoPlayer(this, spawnX, spawnY);
  }

  setupSpawnPoints(): void {
    // Define enemy spawn points based on map structure
    this.spawnPoints = [
      { x: 800, y: 13 * 64 }, // Elevated platform 1
      { x: 1600, y: 11 * 64 }, // Elevated platform 2
      { x: 2300, y: 14 * 64 }, // Elevated platform 3
      { x: 2800, y: 17 * 64 }, // Final ground section
      { x: 1300, y: 9 * 64 }, // Small floating platform 1
      { x: 1900, y: 8 * 64 }, // Small floating platform 2
      { x: 2900, y: 10 * 64 }, // High platform
    ];
  }

  startEnemySpawning(): void {
    // Start enemy spawner
    this.enemySpawner = this.time.addEvent({
      delay: enemyConfig.spawnInterval.value,
      callback: () => {
        this.spawnEnemy();
      },
      loop: true
    });
  }

  spawnEnemy(): void {
    // Don't spawn if max enemies reached
    const activeEnemies = this.enemies.children.entries.filter(enemy => enemy.active).length;
    if (activeEnemies >= enemyConfig.maxEnemies.value) {
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
      
      const enemy = new JungleEnemy(this, chosenSpawn.x, chosenSpawn.y);
      this.enemies.add(enemy);
    } else {
      const enemy = new JungleEnemy(this, spawnPoint.x, spawnPoint.y);
      this.enemies.add(enemy);
    }
  }

  setupCollisions(): void {
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
    this.player.update(time, delta);

    // Update enemies
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy && enemy.active && enemy.update) {
        enemy.update(time, delta);
      }
    });

    // Collect player projectiles for collision detection
    this.playerProjectiles.clear();
    if (this.player.projectiles) {
      this.player.projectiles.children.entries.forEach((projectile: any) => {
        if (projectile && projectile.active) {
          this.playerProjectiles.add(projectile);
        }
      });
    }

    // Collect enemy projectiles for collision detection
    this.enemyProjectiles.clear();
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

  // Add score based on difficulty multiplier
  addScore(points: number): void {
    const multiplier = difficultyConfig[this.difficulty].value;
    this.score += points * multiplier;
  }

  // Get current score
  getScore(): number {
    return this.score;
  }

  // Set difficulty
  setDifficulty(difficulty: "easy" | "hard" | "cursed"): void {
    this.difficulty = difficulty;
  }

  // Get current difficulty  
  getDifficulty(): string {
    return this.difficulty;
  }
}