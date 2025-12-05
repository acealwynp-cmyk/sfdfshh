import Phaser from "phaser";
import FSM from "phaser3-rex-plugins/plugins/fsm.js";
import type { CommandoPlayer } from "./CommandoPlayer";

// Custom FSM class for managing player states
export class PlayerFSM extends FSM {
  public scene: Phaser.Scene;
  public player: CommandoPlayer;

  constructor(scene: Phaser.Scene, player: CommandoPlayer) {
    super({
      // IMPORTANT: Do NOT use `start: "state_name"` here
      // Reason: Using `start` config will set the initial state but will NOT trigger the enter_state() function
      // Instead, we call this.goto("state_name") after initialization to properly trigger enter_state()
      extend: {
        eventEmitter: new Phaser.Events.EventEmitter(),
      },
    });
    this.scene = scene;
    this.player = player;
    
    // Use goto to trigger enter_state function and properly initialize the player state
    this.goto("idle");
  }

  // Common death check method
  checkDeath() {
    if (this.player.health <= 0 && !this.player.isDead) {
      this.player.health = 0;
      this.player.isDead = true;
      this.goto("dying");
      return true;
    }

    if (this.player.y > (this.scene as any).mapHeight + 100 && !this.player.isDead) {
      this.player.health = 0;
      this.player.isDead = true;
      this.scene.scene.launch("GameOverUIScene", {
        currentLevelKey: this.scene.scene.key,
      });
      return true;
    }
    
    return false;
  }

  // Idle state
  enter_idle() {
    this.player.setVelocityX(0);
    this.player.playAnimation("brave_commando_idle_anim");
  }

  update_idle(time: number, delta: number) {
    if (this.checkDeath()) return;

    const cursors = this.player.cursors;
    const mobile = (this.scene as any).mobileControls;
    
    // Left/right movement input detection
    if (cursors.left.isDown || cursors.right.isDown || (mobile && (mobile.leftPressed || mobile.rightPressed))) {
      this.goto("moving");
    } 
    // Shooting input detection  
    else if ((this.player.spaceKey && Phaser.Input.Keyboard.JustDown(this.player.spaceKey)) || (mobile && mobile.shootPressed)) {
      this.goto("shooting");
    }
    // Jump input detection (must be on ground)
    else if ((cursors.up.isDown && this.player.body.onFloor()) || (mobile && mobile.jumpPressed && this.player.body.onFloor())) {
      this.goto("jumping");
    }
  }

  // Moving state
  enter_moving() {
    this.player.playAnimation("brave_commando_walk_anim");
  }

  update_moving(time: number, delta: number) {
    if (this.checkDeath()) return;

    const cursors = this.player.cursors;
    const mobile = (this.scene as any).mobileControls;
    
    // Handle left/right movement
    if (cursors.left.isDown || (mobile && mobile.leftPressed)) {
      this.player.setVelocityX(-this.player.walkSpeed);
      this.player.facingDirection = "left";
    } else if (cursors.right.isDown || (mobile && mobile.rightPressed)) {
      this.player.setVelocityX(this.player.walkSpeed);
      this.player.facingDirection = "right";
    } else {
      this.goto("idle");
      return;
    }

    // Shooting and jump input detection
    if ((this.player.spaceKey && Phaser.Input.Keyboard.JustDown(this.player.spaceKey)) || (mobile && mobile.shootPressed)) {
      this.goto("shooting");
    } else if ((cursors.up.isDown && this.player.body.onFloor()) || (mobile && mobile.jumpPressed && this.player.body.onFloor())) {
      this.goto("jumping");
    }

    // Update facing direction
    this.player.setFlipX(this.player.facingDirection === "left");
  }

  // Jump state (includes up and down)
  enter_jumping() {
    // Only apply upward jump force when on ground
    if (this.player.body.onFloor()) {
      this.player.body.setVelocityY(-this.player.jumpPower);
      this.player.jumpSound?.play();
    }
  }

  update_jumping(time: number, delta: number) {
    if (this.checkDeath()) return;

    const cursors = this.player.cursors;
    const mobile = (this.scene as any).mobileControls;

    // Air movement control
    if (cursors.left.isDown || (mobile && mobile.leftPressed)) {
      this.player.setVelocityX(-this.player.walkSpeed * 0.8); // Reduced air control
      this.player.facingDirection = "left";
    } else if (cursors.right.isDown || (mobile && mobile.rightPressed)) {
      this.player.setVelocityX(this.player.walkSpeed * 0.8);
      this.player.facingDirection = "right";
    }

    // Choose jump up or down animation based on vertical velocity
    if (this.player.body.velocity.y < 0) {
      this.player.playAnimation("brave_commando_jump_up_anim");
    } else {
      this.player.playAnimation("brave_commando_jump_down_anim");
    }

    // Landing detection
    if (this.player.body.onFloor()) {
      if (cursors.left.isDown || cursors.right.isDown || (mobile && (mobile.leftPressed || mobile.rightPressed))) {
        this.goto("moving");
      } else {
        this.goto("idle");
      }
    }

    // Air shooting
    if ((this.player.spaceKey && Phaser.Input.Keyboard.JustDown(this.player.spaceKey)) || (mobile && mobile.shootPressed)) {
      this.goto("shooting");
    }

    // Update facing direction
    this.player.setFlipX(this.player.facingDirection === "left");
  }

  // Shooting state
  enter_shooting() {
    this.player.isShooting = true;
    
    // Don't stop movement completely while shooting
    const cursors = this.player.cursors;
    if (cursors.left.isDown) {
      this.player.setVelocityX(-this.player.walkSpeed * 0.6); // Reduced speed while shooting
      this.player.facingDirection = "left";
    } else if (cursors.right.isDown) {
      this.player.setVelocityX(this.player.walkSpeed * 0.6);
      this.player.facingDirection = "right";
    }

    // Use weapon-specific animation
    const weaponAnimKey = this.player.getCurrentWeaponAnimationKey();
    this.player.playAnimation(weaponAnimKey);
    
    // Fire projectile
    this.player.fireWeapon();

    // State transition after shoot animation completes
    this.player.once(`animationcomplete-${weaponAnimKey}`, () => {
      this.player.isShooting = false;
      
      // Determine next state based on ground/air and input
      if (!this.player.body.onFloor()) {
        this.goto("jumping");
      } else if (cursors.left.isDown || cursors.right.isDown) {
        this.goto("moving");
      } else {
        this.goto("idle");
      }
    });
  }

  update_shooting(time: number, delta: number) {
    if (this.checkDeath()) return;

    const cursors = this.player.cursors;

    // Allow movement while shooting (already reduced in enter_shooting)
    if (cursors.left.isDown) {
      this.player.setVelocityX(-this.player.walkSpeed * 0.6);
      this.player.facingDirection = "left";
    } else if (cursors.right.isDown) {
      this.player.setVelocityX(this.player.walkSpeed * 0.6);
      this.player.facingDirection = "right";
    } else if (this.player.body.onFloor()) {
      this.player.setVelocityX(0); // Stop if not pressing movement keys and on ground
    }

    // Update facing direction
    this.player.setFlipX(this.player.facingDirection === "left");
  }

  // Hurt state
  enter_hurting() {
    this.player.setVelocityX(0);
    
    // Hurt stun timer and state transition logic
    this.scene.time.delayedCall(this.player.hurtingDuration, () => {
      this.player.isHurting = false;
      this.goto("idle");
    });
  }

  update_hurting(time: number, delta: number) {
    if (this.checkDeath()) return;
    // Player is stunned during hurt state, no input processing
  }

  // Death state
  enter_dying() {
    this.player.setVelocityX(0);
    this.player.playAnimation("brave_commando_die_anim");

    // Launch game over UI when death animation completes
    this.player.once('animationcomplete-brave_commando_die_anim', () => {
      this.scene.scene.launch("GameOverUIScene", {
        currentLevelKey: this.scene.scene.key,
      });
    });
  }

  update_dying(time: number, delta: number) {
    // Player is dead, no input processing
  }
}