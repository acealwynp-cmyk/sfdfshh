import Phaser from "phaser";
import * as utils from "./utils";
import { enemyConfig } from "./gameConfig.json";
import { EnemyFSM } from "./EnemyFSM";
import { Projectile } from "./WeaponSystem";

type Direction = "left" | "right";

export interface EnemyConfig {
  idleAnimKey: string;
  walkAnimKey: string;
  shootAnimKey: string;
  dieAnimKey?: string;
  projectileKey: string;
  damage: number;
  projectileSpeed: number;
  soundKey: string;
  scoreValue: number;
  maxRange: number;
  attackRange: number; // Distance at which enemy starts attacking
}

// Base Enemy class that all biome enemies inherit from
export abstract class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  // State machine
  public fsm: EnemyFSM;

  // Character attributes
  public facingDirection: Direction;
  public walkSpeed: number;

  // State flags
  public isDead: boolean;
  public isAttacking: boolean;
  public isHurting: boolean;

  // Health system
  public maxHealth: number;
  public health: number;

  // AI behavior timing
  public lastDirectionChangeTime: number;
  public directionChangeDelay: number;
  public lastAttackTime: number;
  public attackCooldown: number;

  // Enemy config
  protected enemyConfig: EnemyConfig;

  // Projectiles for enemy shooting
  public enemyProjectiles: Phaser.GameObjects.Group;

  // Sound effects
  public deathSound?: Phaser.Sound.BaseSound;

  constructor(scene: Phaser.Scene, x: number, y: number, customEnemyConfig: EnemyConfig) {
    // Use the idle animation first frame as texture key
    super(scene, x, y, customEnemyConfig.idleAnimKey.replace("_anim", "_frame1"));

    // Store enemy config
    this.enemyConfig = customEnemyConfig;

    // Add to scene and physics system
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize character attributes
    this.facingDirection = "left"; // Start facing left
    this.walkSpeed = enemyConfig.walkSpeed.value;

    // Initialize state flags
    this.isDead = false;
    this.isAttacking = false;
    this.isHurting = false;

    // Initialize health system
    this.maxHealth = enemyConfig.maxHealth.value;
    this.health = this.maxHealth;

    // Initialize AI timing
    this.lastDirectionChangeTime = 0;
    this.directionChangeDelay = enemyConfig.directionChangeDelay.value;
    this.lastAttackTime = 0;
    this.attackCooldown = enemyConfig.attackCooldown.value;

    // Create projectiles group
    this.enemyProjectiles = this.scene.add.group();

    // Set physics properties
    this.body.setGravityY(enemyConfig.gravityY.value);

    // Use utility function to initialize sprite's size, scale, etc.
    const standardHeight = 128;
    utils.initScale(this, { x: 0.5, y: 1.0 }, undefined, standardHeight, 0.9, 0.9);

    // Collide with world bounds
    this.body.setCollideWorldBounds(true);

    // Initialize sound effects
    this.initializeSounds();

    // Initialize state machine
    this.fsm = new EnemyFSM(scene, this);
  }

  // Play animation and reset origin and offset
  playAnimation(animKey: string) {
    // Safety check - ensure sprite is ready and animation exists
    if (!this.anims || !this.scene.anims.exists(animKey)) {
      console.warn(`Animation ${animKey} not found or sprite not ready`);
      return;
    }
    
    this.play(animKey, true);
    utils.resetOriginAndOffset(this, this.facingDirection);
  }

  // Get animation keys specific to this enemy type
  getIdleAnimKey(): string {
    return this.enemyConfig.idleAnimKey;
  }

  getWalkAnimKey(): string {
    return this.enemyConfig.walkAnimKey;
  }

  getShootAnimKey(): string {
    return this.enemyConfig.shootAnimKey;
  }

  getDieAnimKey(): string {
    return this.enemyConfig.dieAnimKey || this.getIdleAnimKey(); // Fallback to idle if no die animation
  }

  // Fire at player
  fireAtPlayer(): void {
    const player = (this.scene as any).player;
    if (!player || player.isDead) return;

    // Calculate projectile spawn position
    const centerY = this.y - this.body.height / 2;
    const offsetX = this.facingDirection === "right" ? 40 : -40;
    const spawnX = this.x + offsetX;
    const spawnY = centerY;

    // Calculate direction towards player
    const direction = new Phaser.Math.Vector2(
      player.x - spawnX,
      player.y - spawnY
    ).normalize();

    // Create projectile with range
    const projectile = new Projectile(
      this.scene,
      spawnX,
      spawnY,
      this.enemyConfig.projectileKey,
      this.enemyConfig.damage,
      this.enemyConfig.projectileSpeed,
      this.enemyConfig.maxRange
    );

    // Add to enemy projectiles group
    this.enemyProjectiles.add(projectile);

    // Fire the projectile
    projectile.fire(spawnX, spawnY, direction);

    // Play weapon sound
    const weaponSound = this.scene.sound.get(this.enemyConfig.soundKey);
    if (weaponSound) {
      weaponSound.play();
    }
  }

  // Main update method - called every frame
  update(time: number, delta: number) {
    // Safety check
    if (!this.body || !this.active) {
      return;
    }

    // Update all enemy projectiles
    this.enemyProjectiles.children.entries.forEach((projectile: any) => {
      if (projectile && projectile.active && projectile.update) {
        projectile.update();
      }
    });

    // Use state machine update
    this.fsm.update(time, delta);
  }

  // Damage method
  takeDamage(damage: number) {
    if (this.isDead || this.isHurting) return;

    this.health -= damage;
    this.isHurting = true;

    console.log(`Enemy took ${damage} damage, health: ${this.health}/${this.maxHealth}`);

    // Check if enemy should die
    if (this.health <= 0) {
      console.log("Enemy died!");
      this.health = 0;
      this.isDead = true;
      this.fsm.goto("dying");
      return;
    }

    // Play hit sound
    const hitSound = this.scene.sound.get("enemy_hit");
    if (hitSound) {
      hitSound.play();
    }

    // Switch to hurt state
    this.fsm.goto("hurting");

    // Brief red tint effect
    this.setTint(0xff0000);
    this.scene.time.delayedCall(200, () => {
      this.clearTint();
    });
  }

  // Get health percentage
  getHealthPercentage(): number {
    return (this.health / this.maxHealth) * 100;
  }

  // Get score value for defeating this enemy
  getScoreValue(): number {
    return this.enemyConfig.scoreValue;
  }

  // Initialize sound effects
  initializeSounds() {
    this.deathSound = this.scene.sound.add("enemy_death", {
      volume: 0.3,
    });
  }

  // Cleanup when destroyed
  destroy(fromScene?: boolean): void {
    // Clean up projectiles
    if (this.enemyProjectiles) {
      this.enemyProjectiles.destroy(true);
    }
    
    // Call parent destroy
    super.destroy(fromScene);
  }
}