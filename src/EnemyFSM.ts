import Phaser from "phaser";
import FSM from "phaser3-rex-plugins/plugins/fsm.js";
import type { BaseEnemy } from "./BaseEnemy";

// Enemy FSM for AI behavior
export class EnemyFSM extends FSM {
  public scene: Phaser.Scene;
  public enemy: BaseEnemy;

  constructor(scene: Phaser.Scene, enemy: BaseEnemy) {
    super({
      // IMPORTANT: Do NOT use `start: "state_name"` here
      extend: {
        eventEmitter: new Phaser.Events.EventEmitter(),
      },
    });
    this.scene = scene;
    this.enemy = enemy;
    
    // Use goto to trigger enter_state function and properly initialize the enemy state
    this.goto("patrolling");
  }

  // Common death check method
  checkDeath() {
    if (this.enemy.health <= 0 && !this.enemy.isDead) {
      this.enemy.health = 0;
      this.enemy.isDead = true;
      this.goto("dying");
      return true;
    }

    // Check if enemy falls off the world
    if (this.enemy.y > (this.scene as any).mapHeight + 100 && !this.enemy.isDead) {
      this.enemy.health = 0;
      this.enemy.isDead = true;
      this.enemy.destroy();
      return true;
    }
    
    return false;
  }

  // Patrolling state - default behavior
  enter_patrolling() {
    this.enemy.playAnimation(this.enemy.getIdleAnimKey());
    this.enemy.lastDirectionChangeTime = this.scene.time.now;
  }

  update_patrolling(time: number, delta: number) {
    if (this.checkDeath()) return;

    const currentTime = this.scene.time.now;
    
    // Direction change with debounce
    if (currentTime - this.enemy.lastDirectionChangeTime > this.enemy.directionChangeDelay) {
      // Check for cliff edge to prevent falling
      this.checkCliffEdge();
      
      // Random direction change
      if (Math.random() < 0.3) {
        this.enemy.facingDirection = this.enemy.facingDirection === "right" ? "left" : "right";
        this.enemy.lastDirectionChangeTime = currentTime;
      }
    }

    // Move in current direction
    const velocity = this.enemy.facingDirection === "right" ? this.enemy.walkSpeed : -this.enemy.walkSpeed;
    this.enemy.setVelocityX(velocity);
    this.enemy.playAnimation(this.enemy.getWalkAnimKey());

    // Update facing
    this.enemy.setFlipX(this.enemy.facingDirection === "left");

    // Check if player is nearby for attacking
    const player = (this.scene as any).player;
    if (player && !player.isDead) {
      const distance = Phaser.Math.Distance.Between(this.enemy.x, this.enemy.y, player.x, player.y);
      
      // Attack if within attack range and cooldown is ready
      const attackRange = (this.enemy as any).enemyConfig?.attackRange || 600;
      if (distance < attackRange && currentTime - this.enemy.lastAttackTime > this.enemy.attackCooldown) {
        this.goto("attacking");
      }
    }
  }

  // Check for cliff edges to prevent falling
  checkCliffEdge() {
    const groundLayer = (this.scene as any).groundLayer;
    if (groundLayer && this.enemy.body.onFloor()) {
      // Calculate check position in front of the enemy
      const checkDistance = 32; // Check 32px ahead
      const checkX = this.enemy.facingDirection === "right" 
        ? this.enemy.x + this.enemy.body.width / 2 + checkDistance 
        : this.enemy.x - this.enemy.body.width / 2 - checkDistance;
      const checkY = this.enemy.y + 10; // Check slightly below feet

      // Convert to tile coordinates
      const tileX = groundLayer.worldToTileX(checkX);
      const tileY = groundLayer.worldToTileY(checkY);

      // Check if there's a tile ahead
      const tile = groundLayer.getTileAt(tileX, tileY);
      
      // If no tile ahead (cliff edge), turn around
      if (!tile || tile.index === -1) {
        this.enemy.facingDirection = this.enemy.facingDirection === "right" ? "left" : "right";
        this.enemy.lastDirectionChangeTime = this.scene.time.now;
      }
    }
  }

  // Attacking state
  enter_attacking() {
    this.enemy.isAttacking = true;
    this.enemy.setVelocityX(0); // Stop moving while attacking
    this.enemy.lastAttackTime = this.scene.time.now;

    // Face the player
    const player = (this.scene as any).player;
    if (player) {
      this.enemy.facingDirection = player.x > this.enemy.x ? "right" : "left";
      this.enemy.setFlipX(this.enemy.facingDirection === "left");
    }

    const shootAnimKey = this.enemy.getShootAnimKey();
    this.enemy.playAnimation(shootAnimKey);
    
    // Fire at player
    this.enemy.fireAtPlayer();

    // State transition after attack animation completes
    this.enemy.once(`animationcomplete-${shootAnimKey}`, () => {
      this.enemy.isAttacking = false;
      this.goto("patrolling");
    });
  }

  update_attacking(time: number, delta: number) {
    if (this.checkDeath()) return;
    // Stay still while attacking
    this.enemy.setVelocityX(0);
  }

  // Hurt state
  enter_hurting() {
    this.enemy.setVelocityX(0);
    
    // Brief stun, then return to patrolling
    this.scene.time.delayedCall(200, () => {
      this.enemy.isHurting = false;
      this.goto("patrolling");
    });
  }

  update_hurting(time: number, delta: number) {
    if (this.checkDeath()) return;
    // Enemy is stunned during hurt state
  }

  // Death state
  enter_dying() {
    this.enemy.setVelocityX(0);
    const dieAnimKey = this.enemy.getDieAnimKey();
    this.enemy.playAnimation(dieAnimKey);

    // Play death sound
    this.enemy.deathSound?.play();

    // Award points to player
    const gameScene = this.scene as any;
    if (gameScene.addScore) {
      gameScene.addScore(this.enemy.getScoreValue()); // Use enemy's score value
    }

    // Remove enemy after death animation or timeout
    if (dieAnimKey !== this.enemy.getIdleAnimKey()) {
      // Has proper death animation
      this.enemy.once(`animationcomplete-${dieAnimKey}`, () => {
        this.enemy.destroy();
      });
    } else {
      // No death animation, remove after delay
      this.scene.time.delayedCall(800, () => {
        this.enemy.destroy();
      });
    }
  }

  update_dying(time: number, delta: number) {
    // Enemy is dead, no processing needed
  }
}