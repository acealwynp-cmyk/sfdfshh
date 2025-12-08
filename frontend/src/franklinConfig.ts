/**
 * Franklin Mode Configuration
 * Asset mappings for Franklin Kill the Narcos mode
 */

export const FRANKLIN_ASSETS = {
  // Character sprites
  franklin_idle_1: '/assets/franklin/franklin_sprites/franklin_idle_1.png',
  franklin_idle_2: '/assets/franklin/franklin_sprites/franklin_idle_2.png',
  franklin_walk_1: '/assets/franklin/franklin_sprites/franklin_walk_1.png',
  franklin_walk_2: '/assets/franklin/franklin_sprites/franklin_walk_2.png',
  franklin_jump_1: '/assets/franklin/franklin_sprites/franklin_jump_1.png',
  franklin_jump_2: '/assets/franklin/franklin_sprites/franklin_jump_2.png',
  franklin_slingshot_1: '/assets/franklin/franklin_sprites/franklin_slingshot_1.png',
  franklin_slingshot_2: '/assets/franklin/franklin_sprites/franklin_slingshot_2.png',
  franklin_rifle_1: '/assets/franklin/franklin_sprites/franklin_rifle_1.png',
  franklin_rifle_2: '/assets/franklin/franklin_sprites/franklin_rifle_2.png',
  franklin_flamethrower_1: '/assets/franklin/franklin_sprites/franklin_flamethrower_1.png',
  franklin_flamethrower_2: '/assets/franklin/franklin_sprites/franklin_flamethrower_2.png',
  franklin_die_1: '/assets/franklin/franklin_sprites/franklin_die_1.png',
  franklin_die_2: '/assets/franklin/franklin_sprites/franklin_die_2.png',
  
  // Enemy sprites
  narco_idle_1: '/assets/franklin/narco_sprites/narco_idle_1.png',
  narco_idle_2: '/assets/franklin/narco_sprites/narco_idle_2.png',
  narco_walk_1: '/assets/franklin/narco_sprites/narco_walk_1.png',
  narco_walk_2: '/assets/franklin/narco_sprites/narco_walk_2.png',
  narco_attack_1: '/assets/franklin/narco_sprites/narco_attack_1.png',
  narco_attack_2: '/assets/franklin/narco_sprites/narco_attack_2.png',
  narco_die_1: '/assets/franklin/narco_sprites/narco_die_1.png',
  narco_die_2: '/assets/franklin/narco_sprites/narco_die_2.png',
  
  // Background and tiles
  beach_background: '/assets/franklin/beach_background.png',
  beach_tileset: '/assets/franklin/beach_tileset.png',
  
  // Projectiles
  turtle_shell: '/assets/franklin/turtle_shell.png',
  
  // Power-ups
  health_potion: '/assets/franklin/health_potion.png',
  shield_potion: '/assets/franklin/shield_potion.png',
  invincibility_potion: '/assets/franklin/invincibility_potion.png',
};

export const FRANKLIN_ANIMATIONS = {
  player: {
    idle: { key: 'franklin_idle_anim', frames: ['franklin_idle_1', 'franklin_idle_2'], frameRate: 8 },
    walk: { key: 'franklin_walk_anim', frames: ['franklin_walk_1', 'franklin_walk_2'], frameRate: 10 },
    jump_up: { key: 'franklin_jump_up_anim', frames: ['franklin_jump_1'], frameRate: 10 },
    jump_down: { key: 'franklin_jump_down_anim', frames: ['franklin_jump_2'], frameRate: 10 },
    slingshot: { key: 'franklin_slingshot_anim', frames: ['franklin_slingshot_1', 'franklin_slingshot_2'], frameRate: 10 },
    rifle: { key: 'franklin_rifle_anim', frames: ['franklin_rifle_1', 'franklin_rifle_2'], frameRate: 10 },
    flamethrower: { key: 'franklin_flamethrower_anim', frames: ['franklin_flamethrower_1', 'franklin_flamethrower_2'], frameRate: 10 },
    die: { key: 'franklin_die_anim', frames: ['franklin_die_1', 'franklin_die_2'], frameRate: 8 },
  },
  enemy: {
    idle: { key: 'narco_idle_anim', frames: ['narco_idle_1', 'narco_idle_2'], frameRate: 6 },
    walk: { key: 'narco_walk_anim', frames: ['narco_walk_1', 'narco_walk_2'], frameRate: 8 },
    attack: { key: 'narco_attack_anim', frames: ['narco_attack_1', 'narco_attack_2'], frameRate: 10 },
    die: { key: 'narco_die_anim', frames: ['narco_die_1', 'narco_die_2'], frameRate: 8 },
  }
};
