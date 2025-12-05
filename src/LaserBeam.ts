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
  
  constructor(scene: Phaser.Scene, player: any) {
    super(scene, 0, 0);
    this.scene = scene;
    this.player = player;
    this.damage = 25; // Higher damage per tick (0.1 seconds) - kills enemies faster!
    
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
      delay: 50, // Damage every 0.05 seconds (twice as fast!)
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

    // Check all enemies
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
        // Enemy is hit by beam! Deal damage
        enemy.takeDamage(this.damage);
        
        // Visual feedback - bright cyan flash
        if (enemy.setTint && enemy.clearTint) {
          enemy.setTint(0x00FFFF); // Bright cyan
          this.scene.time.delayedCall(40, () => {
            if (enemy && enemy.active && !enemy.isDead) {
              enemy.clearTint();
            }
          });
        }
      }
    });
  }

  destroy(): void {
    if (this.damageTimer) {
      this.damageTimer.destroy();
    }
    super.destroy();
  }
}
