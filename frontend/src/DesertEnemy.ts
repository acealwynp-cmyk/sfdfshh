import { BaseEnemy, type EnemyConfig } from "./BaseEnemy";

// Desert Enemy Trooper class
export class DesertEnemy extends BaseEnemy {
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const desertEnemyConfig: EnemyConfig = {
      idleAnimKey: "desert_enemy_trooper_idle_anim",
      walkAnimKey: "desert_enemy_trooper_walk_anim", 
      shootAnimKey: "desert_enemy_trooper_shoot_anim",
      dieAnimKey: undefined, // No die animation available
      projectileKey: "bullet_projectile",
      damage: 30, // Slightly higher damage than jungle enemies
      projectileSpeed: 650,
      soundKey: "rifle_fire",
      scoreValue: 120, // Higher score value
      maxRange: 900,
      attackRange: 700
    };

    super(scene, x, y, desertEnemyConfig);
  }
}