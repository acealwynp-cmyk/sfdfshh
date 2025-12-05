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
  maxRange: number; // Maximum range for projectile
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
      animationKey: "brave_commando_rifle_shoot_anim",
      maxRange: 800  // Medium range
    },
    [WeaponType.FLAME_THROWER]: {
      name: "Flame Thrower",
      spriteKey: "flame_thrower_weapon", 
      projectileKey: "flame_projectile",
      fireRate: 150,
      damage: 35,
      soundKey: "flame_thrower_fire",
      projectileSpeed: 500,
      animationKey: "brave_commando_flamethrower_shoot_anim",
      maxRange: 300  // Short range
    },
    [WeaponType.ROCKET_LAUNCHER]: {
      name: "Rocket Launcher",
      spriteKey: "rocket_launcher_weapon",
      projectileKey: "missile_projectile", 
      fireRate: 800,
      damage: 75,
      soundKey: "rocket_launcher_fire",
      projectileSpeed: 600,
      animationKey: "brave_commando_rocket_shoot_anim",
      maxRange: 1500  // Long range
    },
    [WeaponType.LASER_BLASTER]: {
      name: "Laser Blaster",
      spriteKey: "laser_blaster_weapon",
      projectileKey: "laser_projectile",
      fireRate: 300,
      damage: 50,
      soundKey: "laser_blaster_fire",
      projectileSpeed: 1200,
      animationKey: "brave_commando_laser_shoot_anim",
      maxRange: 1800  // Very long range
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

    // Scale bullets properly - very small for realism
    this.setScale(0.15, 0.15); // Tiny bullet size (smaller than gun)

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
    // Create hit effect or explosion for rockets
    this.destroy();
  }
  
  // Create explosion with area damage
  explode(scene: Phaser.Scene, x: number, y: number, damage: number): void {
    // Create explosion visual effect
    const explosion = scene.add.sprite(x, y, 'flame_projectile');
    explosion.setScale(3, 3); // Large explosion
    explosion.setAlpha(0.9);
    explosion.setTint(0xFF6600); // Orange/red fire tint
    
    // Animate explosion
    scene.tweens.add({
      targets: explosion,
      scale: 4.5,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        explosion.destroy();
      }
    });
    
    // Add secondary fire effects
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = Phaser.Math.Between(40, 80);
      const fx = x + Math.cos(angle) * distance;
      const fy = y + Math.sin(angle) * distance;
      
      const fire = scene.add.sprite(fx, fy, 'flame_projectile');
      fire.setScale(1.5, 1.5);
      fire.setTint(0xFF8800);
      fire.setAlpha(0.8);
      
      scene.tweens.add({
        targets: fire,
        scale: 0,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          fire.destroy();
        }
      });
    }
    
    // Deal area damage to enemies
    const explosionRadius = 150; // Damage radius
    const gameScene = scene as any;
    
    if (gameScene.enemies) {
      gameScene.enemies.getChildren().forEach((enemy: any) => {
        if (!enemy || !enemy.active || enemy.isDead) return;
        
        const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        
        if (distance < explosionRadius) {
          // Damage based on distance (closer = more damage)
          const damageMultiplier = 1 - (distance / explosionRadius);
          const actualDamage = Math.floor(damage * damageMultiplier);
          
          enemy.takeDamage(actualDamage);
          
          // Push enemy back from explosion
          const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
          const force = 200 * damageMultiplier;
          enemy.setVelocity(
            Math.cos(angle) * force,
            Math.sin(angle) * force - 100
          );
        }
      });
    }
  }

  update(): void {
    // Check if projectile has traveled beyond max range
    const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
    if (distance > this.maxRange) {
      this.destroy();
      return;
    }
    
    // Don't destroy based on screen position - let camera follow handle visibility
    // Only destroy if VERY far from camera
    const cam = this.scene.cameras.main;
    const camCenterX = cam.scrollX + cam.width / 2;
    
    // Keep projectiles within reasonable range of camera
    if (Math.abs(this.x - camCenterX) > 3000) {
      this.destroy();
    }
  }
}