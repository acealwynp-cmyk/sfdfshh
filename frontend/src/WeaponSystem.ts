import Phaser from "phaser";
import * as utils from "./utils";
import { gameplayConfig } from "./gameConfig.json";

export enum WeaponType {
  COMBAT_RIFLE = "combat_rifle",
  FLAME_THROWER = "flame_thrower"
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
    }
  };

  public static readonly WEAPON_ORDER: WeaponType[] = [
    WeaponType.COMBAT_RIFLE,
    WeaponType.FLAME_THROWER,
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
  public isRocket: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, damage: number, speed: number, maxRange: number = 2000, isRocket: boolean = false) {
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
    this.isRocket = isRocket;

    // Scale projectiles
    if (isRocket) {
      this.setScale(0.4, 0.4); // Rockets are bigger
    } else {
      this.setScale(0.075, 0.075); // Bullets SUPER TINY (75% smaller than before!)
    }

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
    // Create explosion for rockets
    if (this.isRocket) {
      this.createExplosion(this.scene, this.x, this.y, this.damage);
    }
    this.destroy();
  }
  
  // Create explosion with area damage
  createExplosion(scene: Phaser.Scene, x: number, y: number, damage: number): void {
    // Small explosion visual effect at impact point
    const explosion = scene.add.sprite(x, y, 'flame_projectile');
    explosion.setScale(1.2, 1.2); // Small explosion
    explosion.setAlpha(0.95);
    explosion.setTint(0xFF5500); // Orange fire tint
    
    // Quick explosion animation
    scene.tweens.add({
      targets: explosion,
      scale: 2,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        explosion.destroy();
      }
    });
    
    // Deal area damage to enemies and apply fire effect
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
          
          // Apply fire animation to enemy (flamethrower effect)
          this.applyFireEffect(scene, enemy);
          
          // Push enemy back from explosion
          const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
          const force = 150 * damageMultiplier;
          enemy.setVelocity(
            Math.cos(angle) * force,
            Math.sin(angle) * force - 80
          );
        }
      });
    }
  }
  
  // Apply fire animation effect to enemy
  applyFireEffect(scene: Phaser.Scene, enemy: any): void {
    if (!enemy || !enemy.active) return;
    
    // Create fire sprite on enemy using flamethrower asset
    const fire = scene.add.sprite(enemy.x, enemy.y, 'flame_projectile');
    fire.setScale(1.5, 1.5);
    fire.setTint(0xFF6600); // Orange/red fire
    fire.setAlpha(0.9);
    fire.setDepth(enemy.depth + 1);
    
    // Animate fire burning on enemy
    scene.tweens.add({
      targets: fire,
      scale: 2.2,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onUpdate: () => {
        // Fire follows enemy position
        if (enemy && enemy.active) {
          fire.setPosition(enemy.x, enemy.y - 20);
        }
      },
      onComplete: () => {
        fire.destroy();
      }
    });
    
    // Additional flame particles
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 150, () => {
        if (!enemy || !enemy.active) return;
        
        const particle = scene.add.sprite(
          enemy.x + Phaser.Math.Between(-20, 20),
          enemy.y - Phaser.Math.Between(10, 30),
          'flame_projectile'
        );
        particle.setScale(0.8, 0.8);
        particle.setTint(0xFF8800);
        particle.setAlpha(0.8);
        
        scene.tweens.add({
          targets: particle,
          y: particle.y - 40,
          scale: 0.3,
          alpha: 0,
          duration: 400,
          ease: 'Power2',
          onComplete: () => {
            particle.destroy();
          }
        });
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