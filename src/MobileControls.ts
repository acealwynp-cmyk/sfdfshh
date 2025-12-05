import Phaser from "phaser";

export class MobileControls {
  private scene: Phaser.Scene;
  private controlsContainer!: Phaser.GameObjects.Container;
  
  // Touch states
  public leftPressed: boolean = false;
  public rightPressed: boolean = false;
  public jumpPressed: boolean = false;
  public shootPressed: boolean = false;
  public weaponSwitchPressed: boolean = false;

  // Button references
  private leftButton!: Phaser.GameObjects.Graphics;
  private rightButton!: Phaser.GameObjects.Graphics;
  private jumpButton!: Phaser.GameObjects.Graphics;
  private shootButton!: Phaser.GameObjects.Graphics;
  private weaponButton!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createMobileControls();
  }

  private createMobileControls(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Only show controls on mobile/touch devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || ('ontouchstart' in window);
    
    if (!isMobile && width > 768) {
      return; // Don't show controls on desktop
    }

    // Create container for all controls
    this.controlsContainer = this.scene.add.container(0, 0);
    this.controlsContainer.setDepth(1000);
    this.controlsContainer.setScrollFactor(0);

    const buttonSize = 70;
    const padding = 20;

    // Left button (bottom-left)
    this.leftButton = this.createButton(
      padding + buttonSize / 2,
      height - padding - buttonSize / 2,
      buttonSize,
      '←'
    );
    this.addButtonInteraction(this.leftButton, 'left');

    // Right button (next to left)
    this.rightButton = this.createButton(
      padding + buttonSize * 1.5 + 10,
      height - padding - buttonSize / 2,
      buttonSize,
      '→'
    );
    this.addButtonInteraction(this.rightButton, 'right');

    // Jump button (bottom-right area)
    this.jumpButton = this.createButton(
      width - padding - buttonSize / 2,
      height - padding - buttonSize / 2,
      buttonSize,
      '↑'
    );
    this.addButtonInteraction(this.jumpButton, 'jump');

    // Shoot button (above jump)
    this.shootButton = this.createButton(
      width - padding - buttonSize / 2,
      height - padding - buttonSize * 1.5 - 10,
      buttonSize,
      '⚡'
    );
    this.addButtonInteraction(this.shootButton, 'shoot');

    // Weapon switch button (top-right corner)
    this.weaponButton = this.createButton(
      width - padding - buttonSize / 2,
      padding + buttonSize / 2 + 120,
      buttonSize * 0.8,
      'Q'
    );
    this.addButtonInteraction(this.weaponButton, 'weapon');

    // Add all buttons to container
    this.controlsContainer.add([
      this.leftButton,
      this.rightButton,
      this.jumpButton,
      this.shootButton,
      this.weaponButton
    ]);
  }

  private createButton(x: number, y: number, size: number, label: string): Phaser.GameObjects.Graphics {
    const button = this.scene.add.graphics();
    button.setPosition(x, y);
    
    // Draw button background
    button.fillStyle(0x000000, 0.5);
    button.fillCircle(0, 0, size / 2);
    
    button.lineStyle(3, 0xffffff, 0.8);
    button.strokeCircle(0, 0, size / 2);
    
    // Add label text
    const text = this.scene.add.text(0, 0, label, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5);
    text.setPosition(x, y);
    
    // Make interactive
    button.setInteractive(
      new Phaser.Geom.Circle(0, 0, size / 2),
      Phaser.Geom.Circle.Contains
    );

    return button;
  }

  private addButtonInteraction(button: Phaser.GameObjects.Graphics, type: string): void {
    button.on('pointerdown', () => {
      this.handleButtonPress(type, true);
      // Visual feedback
      button.clear();
      button.fillStyle(0xffffff, 0.3);
      button.fillCircle(0, 0, 35);
      button.lineStyle(3, 0x00ff00, 1);
      button.strokeCircle(0, 0, 35);
    });

    button.on('pointerup', () => {
      this.handleButtonPress(type, false);
      // Reset visual
      button.clear();
      button.fillStyle(0x000000, 0.5);
      button.fillCircle(0, 0, 35);
      button.lineStyle(3, 0xffffff, 0.8);
      button.strokeCircle(0, 0, 35);
    });

    button.on('pointerout', () => {
      this.handleButtonPress(type, false);
      // Reset visual
      button.clear();
      button.fillStyle(0x000000, 0.5);
      button.fillCircle(0, 0, 35);
      button.lineStyle(3, 0xffffff, 0.8);
      button.strokeCircle(0, 0, 35);
    });
  }

  private handleButtonPress(type: string, pressed: boolean): void {
    switch (type) {
      case 'left':
        this.leftPressed = pressed;
        break;
      case 'right':
        this.rightPressed = pressed;
        break;
      case 'jump':
        this.jumpPressed = pressed;
        break;
      case 'shoot':
        this.shootPressed = pressed;
        break;
      case 'weapon':
        if (pressed) {
          this.weaponSwitchPressed = true;
          // Reset after a short delay
          this.scene.time.delayedCall(100, () => {
            this.weaponSwitchPressed = false;
          });
        }
        break;
    }
  }

  public update(): void {
    // Update button positions if screen resizes
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    if (this.controlsContainer) {
      // Could update positions here if needed
    }
  }

  public destroy(): void {
    if (this.controlsContainer) {
      this.controlsContainer.destroy();
    }
  }
}
