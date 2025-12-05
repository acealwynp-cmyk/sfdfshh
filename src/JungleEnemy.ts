import { BaseEnemy, type EnemyConfig } from "./BaseEnemy";

// Jungle Enemy Soldier class
export class JungleEnemy extends BaseEnemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const jungleEnemyConfig: EnemyConfig = {
      idleAnimKey: "jungle_enemy_soldier_idle_anim",
      walkAnimKey: "jungle_enemy_soldier_walk_anim",
      shootAnimKey: "jungle_enemy_soldier_shoot_anim", 
      dieAnimKey: "jungle_enemy_soldier_die_anim",
      projectileKey: "bullet_projectile",
      damage: 25,
      projectileSpeed: 600,
      soundKey: "rifle_fire",
      scoreValue: 100
    };

    super(scene, x, y, jungleEnemyConfig);
  }
}
