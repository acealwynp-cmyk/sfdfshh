import Phaser from "phaser";

export class LaserBeam extends Phaser.GameObjects.Container {
  private beamGraphics: Phaser.GameObjects.Graphics;
  private beamSprite?: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  private player: any;
  private damage: number;
  private isActive: boolean = false;
  private maxLength: number = 1800;
  private damageTimer?: Phaser.Time.TimerEvent;
  
  // CUMULATIVE DAMAGE TRACKING - damage persists even if laser stops and restarts
  private enemyLaserDamage: Map<any, number> = new Map();
  
  constructor(scene: Phaser.Scene, player: any) {
    super(scene, 0, 0);
    this.scene = scene;
    this.player = player;
    this.damage = 17.5; // 50 HP / 3 seconds = 17.5 damage per second (kills in ~2.9 seconds, even in groups)
    
    // Create graphics for beam
    this.beamGraphics = scene.add.graphics();
    this.add(this.beamGraphics);
    
    // Try to use laser projectile sprite if available
    try {
      this.beamSprite = scene.add.sprite(0, 0, 'laser_projectile');
      this.beamSprite.setOrigin(0, 0.5);
      this.beamSprite.setTint(0x00FFFF); // Cyan tint
      this.add(this.beamSprite);
    } catch (e) {
      // Sprite not available, use graphics only
    }
    
    scene.add.existing(this);
    this.setDepth(100);
    this.setVisible(false);
  }

  startBeam(): void {
    this.isActive = true;
    this.setVisible(true);
    
    // Start damage tick - faster for more effective killing
    if (this.damageTimer) {
      this.damageTimer.destroy();
    }
    
    this.damageTimer = this.scene.time.addEvent({
      delay: 200, // Damage every 0.2 seconds (5 ticks per second)
      callback: () => {
        this.checkEnemyCollisions();
      },
      loop: true
    });
  }

  stopBeam(): void {
    this.isActive = false;
    this.setVisible(false);
    
    if (this.damageTimer) {
      this.damageTimer.destroy();
      this.damageTimer = undefined;
    }
  }

  update(): void {
    if (!this.isActive || !this.player || !this.player.active) {
      return;
    }

    // Position beam at player's weapon
    const playerCenterY = this.player.y - this.player.body.height / 2;
    const offsetX = this.player.facingDirection === "right" ? 40 : -40;
    const startX = this.player.x + offsetX;
    const startY = playerCenterY;

    this.setPosition(startX, startY);

    // Calculate beam end point based on player direction
    const direction = this.player.facingDirection === "right" ? 1 : -1;
    const endX = direction * this.maxLength;

    // Draw the laser beam - SINGLE THIN LINE (2 pixels like image)
    this.beamGraphics.clear();
    
    // Single ultra-thin bright blue laser beam (exactly 2 pixels)
    this.beamGraphics.lineStyle(2, 0x00AAFF, 1.0); // 2px bright blue
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(0, 0);
    this.beamGraphics.lineTo(endX, 0);
    this.beamGraphics.strokePath();

    // Hide sprite - we're using pure line graphics only
    if (this.beamSprite) {
      this.beamSprite.setVisible(false);
    }
  }

  checkEnemyCollisions(): void {
    if (!this.isActive) return;

    const gameScene = this.scene as any;
    if (!gameScene.enemies) return;

    const startX = this.x;
    const startY = this.y;
    const direction = this.player.facingDirection === "right" ? 1 : -1;

    let enemiesHitThisTick = 0;

    // Check all enemies - EACH enemy gets FULL damage independently
    gameScene.enemies.children.entries.forEach((enemy: any) => {
      if (!enemy || !enemy.active || enemy.isDead) return;

      // More accurate collision detection - check enemy body
      const enemyX = enemy.x;
      const enemyY = enemy.y;
      const enemyWidth = enemy.body ? enemy.body.width : 64;
      const enemyHeight = enemy.body ? enemy.body.height : 64;

      // Check if enemy is in beam path with better accuracy
      let inBeamX = false;
      if (direction > 0) {
        // Firing right
        inBeamX = enemyX > startX && enemyX < startX + this.maxLength;
      } else {
        // Firing left
        inBeamX = enemyX < startX && enemyX > startX - this.maxLength;
      }
      
      // More generous Y tolerance to hit enemies on platforms
      const inBeamY = Math.abs(enemyY - startY) < 80;

      if (inBeamX && inBeamY) {
        enemiesHitThisTick++;
        
        // FULL DAMAGE TO EACH ENEMY - no splitting!
        // 50 HP / 3 seconds = 16.67 dmg/sec, 5 ticks/sec = 3.34 per tick
        // Increased to ensure 3 second kills even with groups
        const damagePerTick = 3.5; // Slightly increased for reliability
        
        const currentDamage = this.enemyLaserDamage.get(enemy) || 0;
        const newDamage = currentDamage + damagePerTick;
        
        this.enemyLaserDamage.set(enemy, newDamage);
        
        // Deal FULL damage to THIS enemy (not split among group)
        enemy.takeDamage(damagePerTick);
        
        // Calculate contact time for logging
        const contactTimeSeconds = (newDamage / 17.5).toFixed(1);
        
        // Visual feedback - bright cyan flash
        if (enemy.setTint && enemy.clearTint) {
          enemy.setTint(0x00FFFF); // Bright cyan laser burn
          this.scene.time.delayedCall(40, () => {
            if (enemy && enemy.active && !enemy.isDead) {
              enemy.clearTint();
            }
          });
        }
        
        // Clean up tracking if enemy dies
        if (enemy.isDead) {
          this.enemyLaserDamage.delete(enemy);
          console.log(`✓ Enemy killed by laser! (${contactTimeSeconds}s contact, ${enemiesHitThisTick} enemies in beam)`);
        }
      }
    });

    // Log group damage info occasionally
    if (enemiesHitThisTick > 1 && Math.random() < 0.1) {
      console.log(`Laser hitting ${enemiesHitThisTick} enemies simultaneously - EACH getting full damage!`);
    }
  }

  destroy(): void {
    if (this.damageTimer) {
      this.damageTimer.destroy();
    }
    super.destroy();
  }
}
