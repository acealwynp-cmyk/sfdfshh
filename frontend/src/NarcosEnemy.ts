import { BaseEnemy, type EnemyConfig } from "./BaseEnemy";

// Narcos Enemy class for Franklin Mode
export class NarcosEnemy extends BaseEnemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const narcosEnemyConfig: EnemyConfig = {
      idleAnimKey: "narco_idle_anim",
      walkAnimKey: "narco_walk_anim",
      shootAnimKey: "narco_attack_anim", 
      dieAnimKey: "narco_die_anim",
      projectileKey: "bullet_projectile",
      damage: 25,
      projectileSpeed: 600,
      soundKey: "rifle_fire",
      scoreValue: 100,
      maxRange: 800,
      attackRange: 600
    };

    super(scene, x, y, narcosEnemyConfig);
  }
}
