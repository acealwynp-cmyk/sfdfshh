import { BaseEnemy, type EnemyConfig } from "./BaseEnemy";

// Space Enemy Cyborg class
export class SpaceEnemy extends BaseEnemy {
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const spaceEnemyConfig: EnemyConfig = {
      idleAnimKey: "space_enemy_cyborg_idle_anim",
      walkAnimKey: "space_enemy_cyborg_walk_anim", 
      shootAnimKey: "space_enemy_cyborg_shoot_anim",
      dieAnimKey: undefined, // No die animation available
      projectileKey: "laser_projectile", // Cyborgs use energy weapons
      damage: 50, // High tech weapons do more damage
      projectileSpeed: 1000, // Fastest projectiles
      soundKey: "laser_blaster_fire",
      scoreValue: 200 // Highest score value
    };

    super(scene, x, y, spaceEnemyConfig);
  }
}