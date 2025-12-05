import Phaser from "phaser";
import * as utils from "./utils";
import { gameplayConfig } from "./gameConfig.json";

export enum WeaponType {
  COMBAT_RIFLE = "combat_rifle",
  FLAME_THROWER = "flame_thrower", 
  ROCKET_LAUNCHER = "rocket_launcher",
  LASER_BLASTER = "laser_blaster"
}

export interface WeaponConfig {
  name: string;
  spriteKey: string;
  projectileKey: string;
  fireRate: number;
  damage: number;
  soundKey: string;
  projectileSpeed: number;
  animationKey: string; // Weapon-specific shooting animation
}

export class WeaponManager {
  public static readonly WEAPON_CONFIGS: { [key in WeaponType]: WeaponConfig } = {
    [WeaponType.COMBAT_RIFLE]: {
      name: "Combat Rifle",
      spriteKey: "combat_rifle_weapon",
      projectileKey: "bullet_projectile",
      fireRate: 200,
      damage: 25,
      soundKey: "rifle_fire",
      projectileSpeed: 800,
      animationKey: "brave_commando_rifle_shoot_anim"
    },
    [WeaponType.FLAME_THROWER]: {
      name: "Flame Thrower",
      spriteKey: "flame_thrower_weapon", 
      projectileKey: "flame_projectile",
      fireRate: 150,
      damage: 35,
      soundKey: "flame_thrower_fire",
      projectileSpeed: 600,
      animationKey: "brave_commando_flamethrower_shoot_anim"
    },
    [WeaponType.ROCKET_LAUNCHER]: {
      name: "Rocket Launcher",
      spriteKey: "rocket_launcher_weapon",
      projectileKey: "missile_projectile", 
      fireRate: 800,
      damage: 75,
      soundKey: "rocket_launcher_fire",
      projectileSpeed: 500,
      animationKey: "brave_commando_rocket_shoot_anim"
    },
    [WeaponType.LASER_BLASTER]: {
      name: "Laser Blaster",
      spriteKey: "laser_blaster_weapon",
      projectileKey: "laser_projectile",
      fireRate: 300,
      damage: 50,
      soundKey: "laser_blaster_fire",
      projectileSpeed: 1000,
      animationKey: "brave_commando_laser_shoot_anim"
    }
  };

  public static readonly WEAPON_ORDER: WeaponType[] = [
    WeaponType.COMBAT_RIFLE,
    WeaponType.FLAME_THROWER,
    WeaponType.ROCKET_LAUNCHER,
    WeaponType.LASER_BLASTER
  ];

  public static getNextWeapon(currentWeapon: WeaponType): WeaponType {
    const currentIndex = this.WEAPON_ORDER.indexOf(currentWeapon);
    return this.WEAPON_ORDER[(currentIndex + 1) % this.WEAPON_ORDER.length];
  }

  public static getPreviousWeapon(currentWeapon: WeaponType): WeaponType {
    const currentIndex = this.WEAPON_ORDER.indexOf(currentWeapon);
    return this.WEAPON_ORDER[(currentIndex - 1 + this.WEAPON_ORDER.length) % this.WEAPON_ORDER.length];
  }
}

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  public damage: number;
  public speed: number;
  public direction: Phaser.Math.Vector2;
  public maxRange: number;
  public startX: number;
  public startY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, damage: number, speed: number, maxRange: number = 2000) {
    super(scene, x, y, texture);

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize properties
    this.damage = damage;
    this.speed = speed;
    this.maxRange = maxRange;
    this.direction = new Phaser.Math.Vector2(1, 0); // Default facing right
    this.startX = x;
    this.startY = y;

    // Use initScale for proper scaling
    utils.initScale(this, { x: 0.5, y: 0.5 }, undefined, 32, 0.8, 0.8);

    // Remove projectile when it goes off screen
    this.body.setCollideWorldBounds(false);
  }

  fire(startX: number, startY: number, direction: Phaser.Math.Vector2): void {
    // Set position
    this.setPosition(startX, startY);
    this.setActive(true);
    this.setVisible(true);
    
    this.startX = startX;
    this.startY = startY;

    // Store direction
    this.direction = direction.clone().normalize();

    // Calculate rotation based on direction
    const assetDirection = new Phaser.Math.Vector2(1, 0); // Projectile faces right by default
    this.rotation = utils.computeRotation(assetDirection, this.direction);

    // Set velocity
    this.body.setVelocity(
      this.direction.x * this.speed,
      this.direction.y * this.speed
    );

    // Auto-destroy after time based on range and speed
    const lifetime = (this.maxRange / this.speed) * 1000;
    this.scene.time.delayedCall(lifetime, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  hit(): void {
    // Create hit effect or explosion here if needed
    this.destroy();
  }

  update(): void {
    // Check if projectile has traveled beyond max range
    const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
    if (distance > this.maxRange) {
      this.destroy();
      return;
    }
    
    // Remove if off screen (with larger buffer for long range weapons)
    if (this.x < -500 || this.x > this.scene.scale.gameSize.width + 500 ||
        this.y < -500 || this.y > this.scene.scale.gameSize.height + 500) {
      this.destroy();
    }
  }
}