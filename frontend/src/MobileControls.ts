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

    // Create DOM-based mobile controls container with retro styling
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
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.5) 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      box-sizing: border-box;
    `;

    // Create joystick container with retro pixel art style
    this.joystickContainer = document.createElement('div');
    this.joystickContainer.style.cssText = `
      position: relative;
      width: 110px;
      height: 110px;
      background: #1a1a1a;
      border: 4px solid #333;
      box-shadow: 
        inset -4px -4px 0px rgba(0, 0, 0, 0.5),
        inset 4px 4px 0px rgba(255, 255, 255, 0.1),
        0 0 0 2px #000,
        0 6px 0 #000;
      border-radius: 50%;
      flex-shrink: 0;
    `;

    // Create joystick thumb with pixel art style
    this.joystickThumb = document.createElement('div');
    this.joystickThumb.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%);
      border: 3px solid #666;
      box-shadow: 
        inset -2px -2px 0px rgba(0, 0, 0, 0.5),
        inset 2px 2px 0px rgba(255, 255, 255, 0.2),
        0 0 0 1px #000;
      border-radius: 50%;
      transition: all 0.1s;
    `;
    this.joystickContainer.appendChild(this.joystickThumb);

    // Create buttons container for perfect alignment
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 15px;
      align-items: center;
      flex-shrink: 0;
    `;

    // Create Switch Weapon button with retro pixel style
    const switchButton = document.createElement('button');
    switchButton.id = 'mobile-switch-btn';
    switchButton.innerHTML = '<div style="font-size: 18px; font-weight: bold; text-shadow: 2px 2px 0px #000;">SWITCH</div>';
    switchButton.style.cssText = `
      width: 85px;
      height: 85px;
      background: linear-gradient(135deg, #5555ff 0%, #3333dd 100%);
      border: 4px solid #7777ff;
      box-shadow: 
        inset -3px -3px 0px rgba(0, 0, 0, 0.3),
        inset 3px 3px 0px rgba(255, 255, 255, 0.2),
        0 0 0 2px #000,
        0 5px 0 #000,
        0 6px 8px rgba(0, 0, 0, 0.4);
      border-radius: 8px;
      color: white;
      font-family: 'Arial Black', Arial, sans-serif;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      image-rendering: pixelated;
      transition: transform 0.1s;
    `;

    // Create Fire button with retro pixel style
    const fireButton = document.createElement('button');
    fireButton.id = 'mobile-fire-btn';
    fireButton.innerHTML = '<div style="font-size: 20px; font-weight: bold; text-shadow: 2px 2px 0px #000;">FIRE</div>';
    fireButton.style.cssText = `
      width: 85px;
      height: 85px;
      background: linear-gradient(135deg, #ff3333 0%, #dd1111 100%);
      border: 4px solid #ff6666;
      box-shadow: 
        inset -3px -3px 0px rgba(0, 0, 0, 0.3),
        inset 3px 3px 0px rgba(255, 255, 255, 0.2),
        0 0 0 2px #000,
        0 5px 0 #000,
        0 6px 8px rgba(0, 0, 0, 0.4);
      border-radius: 8px;
      color: white;
      font-family: 'Arial Black', Arial, sans-serif;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      image-rendering: pixelated;
      transition: transform 0.1s;
    `;

    // Append buttons to container
    buttonsContainer.appendChild(switchButton);
    buttonsContainer.appendChild(fireButton);

    // Append all controls
    this.controlsContainer.appendChild(this.joystickContainer);
    this.controlsContainer.appendChild(buttonsContainer);
    document.body.appendChild(this.controlsContainer);

    // Setup event listeners
    this.setupJoystickInput();
    this.setupButtonInput(fireButton, switchButton);

    console.log('[MobileControls] Retro-styled controls created');
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

      // Update move direction using FSM-compatible properties
      if (Math.abs(deltaX) > 10) {
        this.leftPressed = deltaX < 0;
        this.rightPressed = deltaX > 0;
      } else {
        this.leftPressed = false;
        this.rightPressed = false;
      }

      // Jump when pulling joystick up (negative Y)
      if (deltaY < -15) {
        this.jumpPressed = true;
      } else {
        this.jumpPressed = false;
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

  private setupButtonInput(fireButton: HTMLButtonElement, switchButton: HTMLButtonElement): void {
    // Fire button - retro press effect
    fireButton.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      this.shootPressed = true;
      fireButton.style.transform = 'translateY(3px)';
      fireButton.style.boxShadow = `
        inset -3px -3px 0px rgba(0, 0, 0, 0.5),
        inset 3px 3px 0px rgba(255, 255, 255, 0.1),
        0 0 0 2px #000,
        0 2px 0 #000,
        0 3px 5px rgba(0, 0, 0, 0.4)
      `;
    });

    fireButton.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      this.shootPressed = false;
      fireButton.style.transform = 'translateY(0)';
      fireButton.style.boxShadow = `
        inset -3px -3px 0px rgba(0, 0, 0, 0.3),
        inset 3px 3px 0px rgba(255, 255, 255, 0.2),
        0 0 0 2px #000,
        0 5px 0 #000,
        0 6px 8px rgba(0, 0, 0, 0.4)
      `;
    });

    // Switch weapon button - retro press effect
    switchButton.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      this.switchWeapon = true;
      switchButton.style.transform = 'translateY(3px)';
      switchButton.style.boxShadow = `
        inset -3px -3px 0px rgba(0, 0, 0, 0.5),
        inset 3px 3px 0px rgba(255, 255, 255, 0.1),
        0 0 0 2px #000,
        0 2px 0 #000,
        0 3px 5px rgba(0, 0, 0, 0.4)
      `;
      
      // Reset after short delay
      setTimeout(() => {
        this.switchWeapon = false;
        switchButton.style.transform = 'translateY(0)';
        switchButton.style.boxShadow = `
          inset -3px -3px 0px rgba(0, 0, 0, 0.3),
          inset 3px 3px 0px rgba(255, 255, 255, 0.2),
          0 0 0 2px #000,
          0 5px 0 #000,
          0 6px 8px rgba(0, 0, 0, 0.4)
        `;
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
