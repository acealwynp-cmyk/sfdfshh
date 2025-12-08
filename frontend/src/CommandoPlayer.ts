import Phaser from "phaser";
import * as utils from "./utils";
import { playerConfig } from "./gameConfig.json";
import { PlayerFSM } from "./PlayerFSM";
import { WeaponType, WeaponManager, Projectile } from "./WeaponSystem";
import { LaserBeam } from "./LaserBeam";

type Direction = "left" | "right";

// Commando player class - inherits from Phaser physics sprite
export class CommandoPlayer extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  // State machine
  public fsm: PlayerFSM;

  // Character attributes
  public facingDirection: Direction;
  public walkSpeed: number;
  public jumpPower: number;

  // State flags
  public isDead: boolean;
  public isShooting: boolean;
  public isHurting: boolean;
  public isInvulnerable: boolean;
  public hurtingDuration: number;
  public invulnerableTime: number;
  public hurtingTimer?: Phaser.Time.TimerEvent;

  // Health system
  public maxHealth: number;
  public health: number;

  // Weapon system
  public currentWeapon: WeaponType;
  public lastFireTime: number;
  public lastWeaponSwitchTime: number;
  public projectiles: Phaser.GameObjects.Group;
  
  // Laser beam system
  public laserBeam?: LaserBeam;
  public isHoldingFire: boolean;

  // Sound effects
  public jumpSound?: Phaser.Sound.BaseSound;

  // Key references - store for FSM access
  public cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  public spaceKey?: Phaser.Input.Keyboard.Key;
  public qKey?: Phaser.Input.Keyboard.Key; // Weapon switch
  public wKey?: Phaser.Input.Keyboard.Key;
  public aKey?: Phaser.Input.Keyboard.Key;
  public sKey?: Phaser.Input.Keyboard.Key;
  public dKey?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Check if Franklin mode
    const franklinMode = (scene as any).franklinMode || false;
    const initialTexture = franklinMode ? "franklin_idle_1" : "brave_commando_idle_frame1";
    
    super(scene, x, y, initialTexture);

    // Add to scene and physics system
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize character attributes
    this.facingDirection = "right";
    this.walkSpeed = playerConfig.walkSpeed.value;
    this.jumpPower = playerConfig.jumpPower.value;

    // Initialize state flags
    this.isDead = false;
    this.isShooting = false;
    this.isHurting = false;
    this.isInvulnerable = false;
    this.hurtingDuration = playerConfig.hurtingDuration.value;
    this.invulnerableTime = playerConfig.invulnerableTime.value;

    // Initialize health system
    this.maxHealth = playerConfig.maxHealth.value;
    this.health = this.maxHealth;

    // Initialize weapon system
    this.currentWeapon = WeaponType.COMBAT_RIFLE;
    this.lastFireTime = 0;
    this.lastWeaponSwitchTime = 0;
    this.isHoldingFire = false;

    // Create projectiles group
    this.projectiles = this.scene.add.group();
    
    // Create laser beam
    this.laserBeam = new LaserBeam(scene, this);

    // Set physics properties
    this.body.setGravityY(playerConfig.gravityY.value);

    // Use utility function to initialize sprite's size, scale, etc.
    const standardHeight = 128;
    utils.initScale(this, { x: 0.5, y: 1.0 }, undefined, standardHeight, 0.9, 0.9);

    // Initialize input controls
    this.setupInput();

    // Initialize sound effects
    this.initializeSounds();

    // Initialize state machine
    this.fsm = new PlayerFSM(scene, this);
  }

  setupInput(): void {
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.qKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    
    // WASD keys for alternative movement
    this.wKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S); // Also used for crouch
    this.dKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  // Play animation and reset origin and offset
  playAnimation(animKey: string) {
    this.play(animKey, true);
    utils.resetOriginAndOffset(this, this.facingDirection);
  }

  // Fire current weapon
  fireWeapon(): void {
    const weaponConfig = WeaponManager.WEAPON_CONFIGS[this.currentWeapon];

    // LASER BLASTER: Continuous beam when holding space
    if (this.currentWeapon === WeaponType.LASER_BLASTER) {
      if (!this.laserBeam) {
        this.laserBeam = new LaserBeam(this.scene, this);
      }
      
      if (!this.isHoldingFire) {
        this.isHoldingFire = true;
        this.laserBeam.startBeam();
        
        // Play laser sound once
        const weaponSound = this.scene.sound.get(weaponConfig.soundKey);
        if (weaponSound) {
          weaponSound.play({ loop: true });
        }
      }
      return;
    }

    // OTHER WEAPONS: Standard projectile firing
    const currentTime = this.scene.time.now;

    // Check fire rate
    if (currentTime - this.lastFireTime < weaponConfig.fireRate) {
      return;
    }

    this.lastFireTime = currentTime;

    // Calculate projectile spawn position (from weapon barrel)
    const centerY = this.y - this.body.height / 2;
    const offsetX = this.facingDirection === "right" ? 40 : -40;
    const spawnX = this.x + offsetX;
    const spawnY = centerY;

    // Calculate firing direction
    const direction = new Phaser.Math.Vector2(
      this.facingDirection === "right" ? 1 : -1, 
      0
    );

    // Create projectile with range
    const projectile = new Projectile(
      this.scene,
      spawnX,
      spawnY,
      weaponConfig.projectileKey,
      weaponConfig.damage,
      weaponConfig.projectileSpeed,
      weaponConfig.maxRange,
      false // No rocket launcher anymore
    );

    // Add to projectiles group for collision handling
    this.projectiles.add(projectile);
    
    // Add to scene's player projectiles group if it exists
    if ((this.scene as any).playerProjectiles) {
      (this.scene as any).playerProjectiles.add(projectile);
    }

    // Fire the projectile
    projectile.fire(spawnX, spawnY, direction);

    // Play weapon sound
    const weaponSound = this.scene.sound.get(weaponConfig.soundKey);
    if (weaponSound) {
      weaponSound.play();
    }
  }
  
  // Stop laser beam when releasing fire button
  stopFiring(): void {
    if (this.currentWeapon === WeaponType.LASER_BLASTER && this.laserBeam) {
      this.isHoldingFire = false;
      this.laserBeam.stopBeam();
      
      // Stop laser sound
      const weaponConfig = WeaponManager.WEAPON_CONFIGS[this.currentWeapon];
      const weaponSound = this.scene.sound.get(weaponConfig.soundKey);
      if (weaponSound && weaponSound.isPlaying) {
        weaponSound.stop();
      }
    }
  }

  // Switch weapon
  switchWeapon(direction: "next" | "previous"): void {
    const currentTime = this.scene.time.now;
    
    // Check weapon switch cooldown
    if (currentTime - this.lastWeaponSwitchTime < 500) {
      return;
    }

    this.lastWeaponSwitchTime = currentTime;

    if (direction === "next") {
      this.currentWeapon = WeaponManager.getNextWeapon(this.currentWeapon);
    } else {
      this.currentWeapon = WeaponManager.getPreviousWeapon(this.currentWeapon);
    }

    // Play weapon pickup sound
    const pickupSound = this.scene.sound.get("weapon_pickup");
    if (pickupSound) {
      pickupSound.play();
    }
  }

  // Main update method - called every frame
  update(time: number, delta: number) {
    // Safety check
    if (!this.body || !this.active) {
      return;
    }

    // Handle weapon switching
    if (this.qKey && Phaser.Input.Keyboard.JustDown(this.qKey)) {
      this.switchWeapon("next");
      // Stop laser beam if switching weapons
      if (this.laserBeam) {
        this.stopFiring();
      }
    }

    // Update laser beam
    if (this.laserBeam) {
      this.laserBeam.update();
    }

    // Update all projectiles (including those far from player)
    this.projectiles.getChildren().forEach((projectile: any) => {
      if (projectile && projectile.active && projectile.update) {
        projectile.update();
      }
    });

    // Use state machine update
    this.fsm.update(time, delta);
  }

  // Damage method
  takeDamage(damage: number) {
    if (this.isInvulnerable || this.isDead) return;

    this.health -= damage;
    this.isHurting = true;
    this.isInvulnerable = true;

    // Switch to hurt state
    this.fsm.goto("hurting");

    // Blinking effect during invulnerable time
    let blinkCount = 0;
    const blinkInterval = 100;
    const totalBlinks = Math.floor(this.invulnerableTime / blinkInterval);

    const blinkTimer = this.scene.time.addEvent({
      delay: blinkInterval,
      callback: () => {
        this.setVisible(!this.visible);
        blinkCount++;
        
        if (blinkCount >= totalBlinks) {
          this.setVisible(true);
          this.isInvulnerable = false;
          blinkTimer.destroy();
        }
      },
      repeat: totalBlinks - 1
    });
  }

  // Get health percentage
  getHealthPercentage(): number {
    return (this.health / this.maxHealth) * 100;
  }

  // Get current weapon name for UI
  getCurrentWeaponName(): string {
    return WeaponManager.WEAPON_CONFIGS[this.currentWeapon].name;
  }

  // Get current weapon animation key
  getCurrentWeaponAnimationKey(): string {
    return WeaponManager.WEAPON_CONFIGS[this.currentWeapon].animationKey;
  }

  // Initialize sound effects
  initializeSounds() {
    this.jumpSound = this.scene.sound.add("player_jump", {
      volume: 0.3,
    });
  }
}