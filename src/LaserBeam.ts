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
    this.damage = 15; // Damage per tick (0.1 seconds)
    
    // Create graphics for beam
    this.beamGraphics = scene.add.graphics();
    this.add(this.beamGraphics);
    
    // Try to use laser projectile sprite if available
    try {
      this.beamSprite = scene.add.sprite(0, 0, 'laser_projectile');
      this.beamSprite.setOrigin(0, 0.5);
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
    
    // Start damage tick
    if (this.damageTimer) {
      this.damageTimer.destroy();
    }
    
    this.damageTimer = this.scene.time.addEvent({
      delay: 100, // Damage every 0.1 seconds
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

    // Calculate beam end point
    const direction = this.player.facingDirection === "right" ? 1 : -1;
    const endX = direction * this.maxLength;

    // Draw the laser beam
    this.beamGraphics.clear();
    
    // Main bright blue beam
    this.beamGraphics.lineStyle(8, 0x00BBFF, 1.0);
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(0, 0);
    this.beamGraphics.lineTo(endX, 0);
    this.beamGraphics.strokePath();
    
    // Inner white hot core
    this.beamGraphics.lineStyle(4, 0xFFFFFF, 0.8);
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(0, 0);
    this.beamGraphics.lineTo(endX, 0);
    this.beamGraphics.strokePath();
    
    // Outer glow
    this.beamGraphics.lineStyle(12, 0x0088FF, 0.3);
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(0, 0);
    this.beamGraphics.lineTo(endX, 0);
    this.beamGraphics.strokePath();

    // Update beam sprite if available
    if (this.beamSprite) {
      this.beamSprite.setVisible(true);
      this.beamSprite.setScale(Math.abs(endX) / 32, 1);
      this.beamSprite.setFlipX(direction < 0);
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

      // Check if enemy is in beam path
      const inBeamX = direction > 0 
        ? enemy.x > startX && enemy.x < startX + this.maxLength
        : enemy.x < startX && enemy.x > startX - this.maxLength;
      
      const inBeamY = Math.abs(enemy.y - startY) < 50; // 50px vertical tolerance

      if (inBeamX && inBeamY) {
        // Enemy is hit by beam!
        enemy.takeDamage(this.damage);
        
        // Visual feedback - flash the enemy
        if (enemy.clearTint) {
          enemy.setTint(0x00FFFF); // Cyan tint
          this.scene.time.delayedCall(50, () => {
            if (enemy && enemy.active) {
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
