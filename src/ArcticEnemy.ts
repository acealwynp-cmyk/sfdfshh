import { BaseEnemy, type EnemyConfig } from "./BaseEnemy";

// Arctic Enemy Soldier class
export class ArcticEnemy extends BaseEnemy {
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const arcticEnemyConfig: EnemyConfig = {
      idleAnimKey: "arctic_enemy_soldier_idle_anim",
      walkAnimKey: "arctic_enemy_soldier_walk_anim", 
      shootAnimKey: "arctic_enemy_soldier_shoot_anim",
      dieAnimKey: undefined, // No die animation available
      projectileKey: "bullet_projectile",
      damage: 35, // Cold climate troops are tough
      projectileSpeed: 700,
      soundKey: "rifle_fire",
      scoreValue: 140, // Good score value
      maxRange: 1000,
      attackRange: 800
    };

    super(scene, x, y, arcticEnemyConfig);
  }
}