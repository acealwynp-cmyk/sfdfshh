import { BaseEnemy, type EnemyConfig } from "./BaseEnemy";

// Urban Enemy Sniper class  
export class UrbanEnemy extends BaseEnemy {
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const urbanEnemyConfig: EnemyConfig = {
      idleAnimKey: "urban_enemy_sniper_idle_anim",
      walkAnimKey: "urban_enemy_sniper_walk_anim", 
      shootAnimKey: "urban_enemy_sniper_shoot_anim",
      dieAnimKey: undefined, // No die animation available
      projectileKey: "bullet_projectile",
      damage: 45, // High damage sniper shots
      projectileSpeed: 900, // Fast sniper bullets
      soundKey: "rifle_fire",
      scoreValue: 150, // Higher score for sniper
      maxRange: 1200, // Long range sniper
      attackRange: 1000
    };

    super(scene, x, y, urbanEnemyConfig);
  }
}