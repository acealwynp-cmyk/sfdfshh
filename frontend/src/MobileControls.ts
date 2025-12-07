import Phaser from 'phaser';

export class MobileControls {
  private scene: Phaser.Scene;
  private joystickBase!: Phaser.GameObjects.Graphics;
  private joystickThumb!: Phaser.GameObjects.Graphics;
  private jumpButton!: Phaser.GameObjects.Graphics;
  private fireButton!: Phaser.GameObjects.Graphics;
  private switchButton!: Phaser.GameObjects.Graphics;
  
  private joystickActive: boolean = false;
  private joystickStartX: number = 0;
  private joystickStartY: number = 0;
  private joystickCenterX: number = 0;
  private joystickCenterY: number = 0;
  
  public moveDirection: number = 0; // -1 = left, 0 = none, 1 = right
  public isJumping: boolean = false;
  public isFiring: boolean = false;
  public switchWeapon: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createControls();
  }

  private createControls(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Only show on mobile/tablet
    if (width > 1024) {
      return; // Desktop - no touch controls needed
    }

    // Joystick on bottom left
    const joystickX = 100;
    const joystickY = height - 100;

    // Joystick Base (larger circle)
    this.joystickBase = this.scene.add.graphics();
    this.joystickBase.setDepth(10000);
    this.joystickBase.fillStyle(0x000000, 0.3);
    this.joystickBase.fillCircle(joystickX, joystickY, 60);
    this.joystickBase.lineStyle(3, 0xffffff, 0.5);
    this.joystickBase.strokeCircle(joystickX, joystickY, 60);
    this.joystickBase.setScrollFactor(0);

    // Joystick Thumb (smaller circle)
    this.joystickThumb = this.scene.add.graphics();
    this.joystickThumb.setDepth(10001);
    this.joystickThumb.fillStyle(0xffffff, 0.6);
    this.joystickThumb.fillCircle(joystickX, joystickY, 30);
    this.joystickThumb.setScrollFactor(0);

    this.joystickCenterX = joystickX;
    this.joystickCenterY = joystickY;

    // Jump Button (bottom right)
    const jumpX = width - 220;
    const jumpY = height - 100;
    
    this.jumpButton = this.scene.add.graphics();
    this.jumpButton.setDepth(10000);
    this.jumpButton.fillStyle(0x00ff00, 0.5);
    this.jumpButton.fillCircle(jumpX, jumpY, 50);
    this.jumpButton.lineStyle(3, 0xffffff, 0.8);
    this.jumpButton.strokeCircle(jumpX, jumpY, 50);
    this.jumpButton.setScrollFactor(0);
    this.jumpButton.setInteractive(
      new Phaser.Geom.Circle(jumpX, jumpY, 50),
      Phaser.Geom.Circle.Contains
    );

    // Add "W" text
    const jumpText = this.scene.add.text(jumpX, jumpY, 'W', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    jumpText.setOrigin(0.5);
    jumpText.setDepth(10001);
    jumpText.setScrollFactor(0);

    // Fire Button
    const fireX = width - 110;
    const fireY = height - 100;
    
    this.fireButton = this.scene.add.graphics();
    this.fireButton.setDepth(10000);
    this.fireButton.fillStyle(0xff0000, 0.5);
    this.fireButton.fillCircle(fireX, fireY, 50);
    this.fireButton.lineStyle(3, 0xffffff, 0.8);
    this.fireButton.strokeCircle(fireX, fireY, 50);
    this.fireButton.setScrollFactor(0);
    this.fireButton.setInteractive(
      new Phaser.Geom.Circle(fireX, fireY, 50),
      Phaser.Geom.Circle.Contains
    );

    // Add "SPACE" text (smaller)
    const fireText = this.scene.add.text(fireX, fireY, 'SPACE', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    fireText.setOrigin(0.5);
    fireText.setDepth(10001);
    fireText.setScrollFactor(0);

    // Switch Weapon Button (above fire)
    const switchX = width - 110;
    const switchY = height - 200;
    
    this.switchButton = this.scene.add.graphics();
    this.switchButton.setDepth(10000);
    this.switchButton.fillStyle(0x0000ff, 0.5);
    this.switchButton.fillCircle(switchX, switchY, 40);
    this.switchButton.lineStyle(3, 0xffffff, 0.8);
    this.switchButton.strokeCircle(switchX, switchY, 40);
    this.switchButton.setScrollFactor(0);
    this.switchButton.setInteractive(
      new Phaser.Geom.Circle(switchX, switchY, 40),
      Phaser.Geom.Circle.Contains
    );

    // Add "Q/E" text
    const switchText = this.scene.add.text(switchX, switchY, 'Q/E', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    switchText.setOrigin(0.5);
    switchText.setDepth(10001);
    switchText.setScrollFactor(0);

    this.setupJoystickInput();
    this.setupButtonInput();
  }

  private setupJoystickInput(): void {
    if (!this.joystickBase) return;

    // Touch/Mouse down on joystick area
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const distance = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        this.joystickCenterX,
        this.joystickCenterY
      );

      if (distance < 60) {
        this.joystickActive = true;
        this.joystickStartX = pointer.x;
        this.joystickStartY = pointer.y;
      }
    });

    // Touch/Mouse move
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickActive) {
        const deltaX = pointer.x - this.joystickCenterX;
        const deltaY = pointer.y - this.joystickCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 40;

        let thumbX, thumbY;
        if (distance > maxDistance) {
          const angle = Math.atan2(deltaY, deltaX);
          thumbX = this.joystickCenterX + Math.cos(angle) * maxDistance;
          thumbY = this.joystickCenterY + Math.sin(angle) * maxDistance;
        } else {
          thumbX = pointer.x;
          thumbY = pointer.y;
        }

        // Update thumb position
        this.joystickThumb.clear();
        this.joystickThumb.fillStyle(0xffffff, 0.8);
        this.joystickThumb.fillCircle(thumbX, thumbY, 30);

        // Calculate move direction
        if (Math.abs(deltaX) > 10) {
          this.moveDirection = deltaX > 0 ? 1 : -1;
        } else {
          this.moveDirection = 0;
        }
      }
    });

    // Touch/Mouse up
    this.scene.input.on('pointerup', () => {
      if (this.joystickActive) {
        this.joystickActive = false;
        this.moveDirection = 0;

        // Reset thumb to center
        this.joystickThumb.clear();
        this.joystickThumb.fillStyle(0xffffff, 0.6);
        this.joystickThumb.fillCircle(this.joystickCenterX, this.joystickCenterY, 30);
      }
    });
  }

  private setupButtonInput(): void {
    if (!this.jumpButton || !this.fireButton || !this.switchButton) return;

    // Jump button
    this.jumpButton.on('pointerdown', () => {
      this.isJumping = true;
      this.jumpButton.clear();
      this.jumpButton.fillStyle(0x00ff00, 0.8); // Brighter when pressed
      this.jumpButton.fillCircle(this.scene.scale.width - 220, this.scene.scale.height - 100, 50);
    });

    this.jumpButton.on('pointerup', () => {
      this.isJumping = false;
      this.jumpButton.clear();
      this.jumpButton.fillStyle(0x00ff00, 0.5);
      this.jumpButton.fillCircle(this.scene.scale.width - 220, this.scene.scale.height - 100, 50);
      this.jumpButton.lineStyle(3, 0xffffff, 0.8);
      this.jumpButton.strokeCircle(this.scene.scale.width - 220, this.scene.scale.height - 100, 50);
    });

    // Fire button
    this.fireButton.on('pointerdown', () => {
      this.isFiring = true;
      this.fireButton.clear();
      this.fireButton.fillStyle(0xff0000, 0.8);
      this.fireButton.fillCircle(this.scene.scale.width - 110, this.scene.scale.height - 100, 50);
    });

    this.fireButton.on('pointerup', () => {
      this.isFiring = false;
      this.fireButton.clear();
      this.fireButton.fillStyle(0xff0000, 0.5);
      this.fireButton.fillCircle(this.scene.scale.width - 110, this.scene.scale.height - 100, 50);
      this.fireButton.lineStyle(3, 0xffffff, 0.8);
      this.fireButton.strokeCircle(this.scene.scale.width - 110, this.scene.scale.height - 100, 50);
    });

    // Switch weapon button
    this.switchButton.on('pointerdown', () => {
      this.switchWeapon = true;
      this.switchButton.clear();
      this.switchButton.fillStyle(0x0000ff, 0.8);
      this.switchButton.fillCircle(this.scene.scale.width - 110, this.scene.scale.height - 200, 40);
      
      // Reset after short delay
      this.scene.time.delayedCall(200, () => {
        this.switchWeapon = false;
        this.switchButton.clear();
        this.switchButton.fillStyle(0x0000ff, 0.5);
        this.switchButton.fillCircle(this.scene.scale.width - 110, this.scene.scale.height - 200, 40);
        this.switchButton.lineStyle(3, 0xffffff, 0.8);
        this.switchButton.strokeCircle(this.scene.scale.width - 110, this.scene.scale.height - 200, 40);
      });
    });
  }

  public destroy(): void {
    if (this.joystickBase) this.joystickBase.destroy();
    if (this.joystickThumb) this.joystickThumb.destroy();
    if (this.jumpButton) this.jumpButton.destroy();
    if (this.fireButton) this.fireButton.destroy();
    if (this.switchButton) this.switchButton.destroy();
  }
}
