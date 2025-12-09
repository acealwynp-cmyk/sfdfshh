export class Preloader extends Phaser.Scene {

        constructor() {
                super("Preloader");
        }

        preload(): void {
                // Load progress bar
                this.setupLoadingProgressUI(this);
                
                // Set max parallel downloads for faster loading
                this.load.maxParallelDownloads = 10;
                
                // Load asset pack by type
                this.load.pack('assetPack', 'assets/asset-pack.json');
                
                // Load Franklin mode assets
                this.loadFranklinAssets();
        }
        
        private loadFranklinAssets(): void {
                // Background and tiles
                this.load.image('beach_background', '/assets/franklin/beach_background.png');
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
                this.scene.start("TitleScreen");
        }

        private setupLoadingProgressUI(scene: Phaser.Scene): void {
                const cam = scene.cameras.main;
                const width = cam.width;
                const height = cam.height;
          
                const barWidth = Math.floor(width * 0.6);
                const barHeight = 20;
                const x = Math.floor((width - barWidth) / 2);
                const y = Math.floor(height * 0.5);
          
                const progressBox = scene.add.graphics();
                progressBox.fillStyle(0x222222, 0.8);
                progressBox.fillRect(x - 4, y - 4, barWidth + 8, barHeight + 8);
          
                const progressBar = scene.add.graphics();
          
                const loadingText = scene.add.text(width / 2, y - 50, '🐢 FRANKLIN IS LOADING...', {
                  fontSize: '24px',
                  color: '#00FFFF',
                  stroke: '#000000',
                  strokeThickness: 4,
                  fontStyle: 'bold'
                }).setOrigin(0.5, 0.5);
          
                // Create turtle sprite walking on the loading bar
                // Using a simple text emoji turtle as a placeholder until franklin walks
                const turtle = scene.add.text(x, y + barHeight / 2, '🐢', {
                  fontSize: '32px'
                }).setOrigin(0.5, 0.5);
          
                const onProgress = (value: number): void => {
                  progressBar.clear();
                  progressBar.fillStyle(0x00FFFF, 1); // Cyan color for beach theme
                  progressBar.fillRect(x, y, barWidth * value, barHeight);
                  
                  // Move turtle along the loading bar
                  turtle.x = x + (barWidth * value);
                  
                  // Animate turtle (wobble effect)
                  const wobble = Math.sin(Date.now() / 100) * 3;
                  turtle.y = y + barHeight / 2 + wobble;
                };
                
                const onComplete = (): void => {
                  cleanup();
                };
          
                scene.load.on('progress', onProgress);
                scene.load.once('complete', onComplete);
          
                const cleanup = (): void => {
                  scene.load.off('progress', onProgress);
                  progressBar.destroy();
                  progressBox.destroy();
                  loadingText.destroy();
                  turtle.destroy();
                };
        }
}
