/**
 * Power-Up System for Franklin Mode
 * Manages health, shield, and invincibility potions
 */

import Phaser from 'phaser';

export enum PowerUpType {
  HEALTH = 'health',
  SHIELD = 'shield',
  INVINCIBILITY = 'invincibility'
}

export class PowerUpSystem {
  private scene: Phaser.Scene;
  private player: any;
  
  // Power-up availability (player starts with 1 of each, no respawn)
  public healthPotionAvailable: boolean = true;
  public shieldPotionAvailable: boolean = true;
  public invincibilityPotionAvailable: boolean = true;
  
  // Active effects
  public shieldActive: boolean = false;
  public invincibilityActive: boolean = false;
  
  private shieldTimer?: Phaser.Time.TimerEvent;
  private invincibilityTimer?: Phaser.Time.TimerEvent;
  
  // Effect durations (in milliseconds)
  private readonly SHIELD_DURATION = 10000; // 10 seconds
  private readonly INVINCIBILITY_DURATION = 10000; // 10 seconds
  
  constructor(scene: Phaser.Scene, player: any) {
    this.scene = scene;
    this.player = player;
  }
  
  /**
   * Use health potion - restore 50% health
   */
  useHealthPotion(): boolean {
    if (!this.healthPotionAvailable) {
      console.log('[PowerUp] Health potion already used');
      return false;
    }
    
    if (this.player.health >= this.player.maxHealth) {
      console.log('[PowerUp] Health already full');
      return false;
    }
    
    // Restore 50% of max health
    const healAmount = Math.floor(this.player.maxHealth * 0.5);
    this.player.health = Math.min(this.player.health + healAmount, this.player.maxHealth);
    
    // Mark as used
    this.healthPotionAvailable = false;
    
    console.log(`[PowerUp] Health potion used! Healed ${healAmount} HP`);
    
    // Play heal sound if available
    if (this.scene.sound.get('powerup_heal')) {
      this.scene.sound.play('powerup_heal');
    }
    
    return true;
  }
  
  /**
   * Use shield potion - absorb damage for 10 seconds
   */
  useShieldPotion(): boolean {
    if (!this.shieldPotionAvailable) {
      console.log('[PowerUp] Shield potion already used');
      return false;
    }
    
    if (this.shieldActive) {
      console.log('[PowerUp] Shield already active');
      return false;
    }
    
    // Activate shield
    this.shieldActive = true;
    this.shieldPotionAvailable = false;
    
    // Visual effect - tint player blue
    if (this.player.setTint) {
      this.player.setTint(0x00ffff);
    }
    
    console.log('[PowerUp] Shield activated for 10 seconds!');
    
    // Set timer to deactivate
    this.shieldTimer = this.scene.time.delayedCall(this.SHIELD_DURATION, () => {
      this.deactivateShield();
    });
    
    return true;
  }
  
  /**
   * Use invincibility potion - become invincible for 5 seconds
   */
  useInvincibilityPotion(): boolean {
    if (!this.invincibilityPotionAvailable) {
      console.log('[PowerUp] Invincibility potion already used');
      return false;
    }
    
    // Activate invincibility
    this.invincibilityActive = true;
    this.invincibilityPotionAvailable = false;
    
    // Visual effect - blinking (alternating alpha)
    this.createBlinkEffect();
    
    console.log('[PowerUp] Invincibility activated for 10 seconds with blinking effect');
    
    // Deactivate after duration
    this.invincibilityTimer = this.scene.time.delayedCall(this.INVINCIBILITY_DURATION, () => {
      this.deactivateInvincibility();
    });
    
    return true;
  }
  
  private createBlinkEffect(): void {
    // Create a repeating blink effect using tweens
    if (this.player && this.scene) {
      this.scene.tweens.add({
        targets: this.player,
        alpha: 0.3,
        duration: 150,
        yoyo: true,
        repeat: Math.floor(this.INVINCIBILITY_DURATION / 300), // Blink for entire duration
        onComplete: () => {
          if (this.player.setAlpha) {
            this.player.setAlpha(1); // Ensure fully visible when done
          }
        }
      });
    }
  }
  
  /**
   * Check if player should take damage (considering shield/invincibility)
   */
  shouldTakeDamage(): boolean {
    if (this.invincibilityActive) {
      console.log('[PowerUp] Damage blocked by invincibility');
      return false;
    }
    
    if (this.shieldActive) {
      console.log('[PowerUp] Damage blocked by shield');
      // Shield absorbs one hit then breaks
      this.deactivateShield();
      return false;
    }
    
    return true;
  }
  
  private deactivateShield(): void {
    this.shieldActive = false;
    
    // Remove tint
    if (this.player.clearTint) {
      this.player.clearTint();
    }
    
    console.log('[PowerUp] Shield expired');
  }
  
  private deactivateInvincibility(): void {
    this.invincibilityActive = false;
    
    // Remove tint and stop blinking
    if (this.player.clearTint) {
      this.player.clearTint();
    }
    if (this.player.setAlpha) {
      this.player.setAlpha(1); // Make sure player is fully visible
    }
    
    console.log('[PowerUp] Invincibility expired');
  }
  
  /**
   * Clean up timers
   */
  destroy(): void {
    if (this.shieldTimer) {
      this.shieldTimer.destroy();
    }
    if (this.invincibilityTimer) {
      this.invincibilityTimer.destroy();
    }
  }
}
