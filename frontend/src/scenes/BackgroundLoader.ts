/**
 * BackgroundLoader - Loads game assets in background after title screen appears
 * This allows instant menu display while assets load silently
 */
export class BackgroundLoader extends Phaser.Scene {
  private assetsLoaded: boolean = false;

  constructor() {
    super("BackgroundLoader");
  }

  preload(): void {
    console.log('🔄 Loading game assets in background...');
    
    // Set max parallel downloads
    this.load.maxParallelDownloads = 15;
    
    // Load full asset pack (all biome assets)
    this.load.pack('assetPack', 'assets/asset-pack.json');
    
    // Load Franklin mode assets
    this.loadFranklinAssets();
    
    // Listen for completion
    this.load.once('complete', () => {
      this.assetsLoaded = true;
      this.registry.set('assetsLoaded', true);
      console.log('✅ All game assets loaded in background!');
    });
  }
  
  private loadFranklinAssets(): void {
    // Background and tiles (title already loaded)
    this.load.image('beach_tileset', '/assets/franklin/beach_tileset.png');
    this.load.image('turtle_shell', '/assets/franklin/turtle_shell.png');
    
    // Power-up potions
    this.load.image('health_potion', '/assets/franklin/health_potion.png');
    this.load.image('shield_potion', '/assets/franklin/shield_potion.png');
    this.load.image('invincibility_potion', '/assets/franklin/invincibility_potion.png');
    
    // Franklin character sprites
    this.load.image('franklin_idle_1', '/assets/franklin/franklin_sprites/franklin_idle_1.png');
    this.load.image('franklin_idle_2', '/assets/franklin/franklin_sprites/franklin_idle_2.png');
    this.load.image('franklin_walk_1', '/assets/franklin/franklin_sprites/franklin_walk_1.png');
    this.load.image('franklin_walk_2', '/assets/franklin/franklin_sprites/franklin_walk_2.png');
    this.load.image('franklin_jump_1', '/assets/franklin/franklin_sprites/franklin_jump_1.png');
    this.load.image('franklin_jump_2', '/assets/franklin/franklin_sprites/franklin_jump_2.png');
    this.load.image('franklin_slingshot_1', '/assets/franklin/franklin_sprites/franklin_slingshot_1.png');
    this.load.image('franklin_slingshot_2', '/assets/franklin/franklin_sprites/franklin_slingshot_2.png');
    this.load.image('franklin_rifle_1', '/assets/franklin/franklin_sprites/franklin_rifle_1.png');
    this.load.image('franklin_rifle_2', '/assets/franklin/franklin_sprites/franklin_rifle_2.png');
    this.load.image('franklin_flamethrower_1', '/assets/franklin/franklin_sprites/franklin_flamethrower_1.png');
    this.load.image('franklin_flamethrower_2', '/assets/franklin/franklin_sprites/franklin_flamethrower_2.png');
    this.load.image('franklin_die_1', '/assets/franklin/franklin_sprites/franklin_die_1.png');
    this.load.image('franklin_die_2', '/assets/franklin/franklin_sprites/franklin_die_2.png');
    
    // Narcos enemy sprites
    this.load.image('narco_idle_1', '/assets/franklin/narco_sprites/narco_idle_1.png');
    this.load.image('narco_idle_2', '/assets/franklin/narco_sprites/narco_idle_2.png');
    this.load.image('narco_walk_1', '/assets/franklin/narco_sprites/narco_walk_1.png');
    this.load.image('narco_walk_2', '/assets/franklin/narco_sprites/narco_walk_2.png');
    this.load.image('narco_attack_1', '/assets/franklin/narco_sprites/narco_attack_1.png');
    this.load.image('narco_attack_2', '/assets/franklin/narco_sprites/narco_attack_2.png');
    this.load.image('narco_die_1', '/assets/franklin/narco_sprites/narco_die_1.png');
    this.load.image('narco_die_2', '/assets/franklin/narco_sprites/narco_die_2.png');
  }

  create(): void {
    // This scene stays active in background
    // It only exists to load assets, no visuals needed
  }
}
