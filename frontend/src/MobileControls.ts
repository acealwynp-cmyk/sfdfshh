import Phaser from 'phaser';

export class MobileControls {
  private scene: Phaser.Scene;
  private controlsContainer?: HTMLDivElement;
  private joystickContainer?: HTMLDivElement;
  private joystickThumb?: HTMLDivElement;
  
  private joystickActive: boolean = false;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  
  // Properties expected by PlayerFSM
  public leftPressed: boolean = false;
  public rightPressed: boolean = false;
  public jumpPressed: boolean = false;
  public shootPressed: boolean = false;
  public switchWeapon: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createControls();
  }

  private createControls(): void {
    // Only show on mobile/tablet (screen width <= 1024px)
    if (window.innerWidth > 1024) {
      return; // Desktop - no touch controls needed
    }

    console.log('[MobileControls] Creating mobile controls for screen:', window.innerWidth, 'x', window.innerHeight);

    // Create DOM-based mobile controls container
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.id = 'mobile-controls';
    this.controlsContainer.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 180px;
      z-index: 9999;
      pointer-events: auto;
      background: rgba(0, 0, 0, 0.3);
    `;

    // Create joystick container
    this.joystickContainer = document.createElement('div');
    this.joystickContainer.style.cssText = `
      position: absolute;
      left: 60px;
      bottom: 60px;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.3);
      border: 3px solid rgba(255, 255, 255, 0.5);
    `;

    // Create joystick thumb
    this.joystickThumb = document.createElement('div');
    this.joystickThumb.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      transition: all 0.1s;
    `;
    this.joystickContainer.appendChild(this.joystickThumb);

    // Create Jump button (green)
    const jumpButton = document.createElement('button');
    jumpButton.id = 'mobile-jump-btn';
    jumpButton.innerHTML = 'W';
    jumpButton.style.cssText = `
      position: absolute;
      right: 130px;
      bottom: 60px;
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: rgba(0, 255, 0, 0.5);
      border: 3px solid rgba(255, 255, 255, 0.8);
      color: white;
      font-size: 32px;
      font-weight: bold;
      font-family: Arial;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    `;

    // Create Fire button (red)
    const fireButton = document.createElement('button');
    fireButton.id = 'mobile-fire-btn';
    fireButton.innerHTML = 'FIRE';
    fireButton.style.cssText = `
      position: absolute;
      right: 20px;
      bottom: 60px;
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: rgba(255, 0, 0, 0.5);
      border: 3px solid rgba(255, 255, 255, 0.8);
      color: white;
      font-size: 20px;
      font-weight: bold;
      font-family: Arial;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    `;

    // Create Switch Weapon button (blue)
    const switchButton = document.createElement('button');
    switchButton.id = 'mobile-switch-btn';
    switchButton.innerHTML = 'Q/E';
    switchButton.style.cssText = `
      position: absolute;
      right: 70px;
      top: 20px;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: rgba(0, 0, 255, 0.5);
      border: 3px solid rgba(255, 255, 255, 0.8);
      color: white;
      font-size: 18px;
      font-weight: bold;
      font-family: Arial;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    `;

    // Append all controls
    this.controlsContainer.appendChild(this.joystickContainer);
    this.controlsContainer.appendChild(jumpButton);
    this.controlsContainer.appendChild(fireButton);
    this.controlsContainer.appendChild(switchButton);
    document.body.appendChild(this.controlsContainer);

    // Setup event listeners
    this.setupJoystickInput();
    this.setupButtonInput(jumpButton, fireButton, switchButton);

    console.log('[MobileControls] DOM controls created');
  }

  private setupJoystickInput(): void {
    if (!this.joystickContainer || !this.joystickThumb) return;

    const resetJoystick = () => {
      if (this.joystickThumb) {
        this.joystickThumb.style.transform = 'translate(-50%, -50%)';
      }
      this.joystickActive = false;
      this.leftPressed = false;
      this.rightPressed = false;
    };

    // Touch start on joystick
    this.joystickContainer.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      this.joystickActive = true;
      const touch = e.touches[0];
      const rect = this.joystickContainer!.getBoundingClientRect();
      this.touchStartX = touch.clientX - rect.left - rect.width / 2;
      this.touchStartY = touch.clientY - rect.top - rect.height / 2;
    });

    // Touch move on joystick
    this.joystickContainer.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.joystickActive || !this.joystickThumb) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const rect = this.joystickContainer!.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      let deltaX = touch.clientX - centerX;
      let deltaY = touch.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 30;

      // Limit thumb movement
      if (distance > maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        deltaX = Math.cos(angle) * maxDistance;
        deltaY = Math.sin(angle) * maxDistance;
      }

      // Update thumb position
      this.joystickThumb.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

      // Update move direction
      if (Math.abs(deltaX) > 10) {
        this.moveDirection = deltaX > 0 ? 1 : -1;
      } else {
        this.moveDirection = 0;
      }
    });

    // Touch end on joystick
    this.joystickContainer.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      resetJoystick();
    });

    this.joystickContainer.addEventListener('touchcancel', (e: TouchEvent) => {
      e.preventDefault();
      resetJoystick();
    });
  }

  private setupButtonInput(jumpButton: HTMLButtonElement, fireButton: HTMLButtonElement, switchButton: HTMLButtonElement): void {
    // Jump button
    jumpButton.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      this.isJumping = true;
      jumpButton.style.background = 'rgba(0, 255, 0, 0.8)';
    });

    jumpButton.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      this.isJumping = false;
      jumpButton.style.background = 'rgba(0, 255, 0, 0.5)';
    });

    // Fire button
    fireButton.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      this.isFiring = true;
      fireButton.style.background = 'rgba(255, 0, 0, 0.8)';
    });

    fireButton.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      this.isFiring = false;
      fireButton.style.background = 'rgba(255, 0, 0, 0.5)';
    });

    // Switch weapon button
    switchButton.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      this.switchWeapon = true;
      switchButton.style.background = 'rgba(0, 0, 255, 0.8)';
      
      // Reset after short delay
      setTimeout(() => {
        this.switchWeapon = false;
        switchButton.style.background = 'rgba(0, 0, 255, 0.5)';
      }, 200);
    });
  }

  public destroy(): void {
    if (this.controlsContainer && this.controlsContainer.parentNode) {
      this.controlsContainer.parentNode.removeChild(this.controlsContainer);
    }
    console.log('[MobileControls] Controls destroyed');
  }
}
