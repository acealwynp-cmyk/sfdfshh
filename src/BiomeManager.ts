/**
 * BiomeManager - Manages biome cycling for infinite survival gameplay
 * Cycles through different biomes every 10 minutes for endless gameplay
 */

export enum BiomeType {
  JUNGLE = "jungle",
  DESERT = "desert", 
  URBAN_RUINS = "urban_ruins",
  ARCTIC_BATTLEFIELD = "arctic_battlefield",
  DEEP_SPACE = "deep_space"
}

export interface BiomeConfig {
  name: string;
  displayName: string;
  backgroundKey: string;
  musicKey: string;
  tilemapKey: string;
  tilesetKey: string;
  enemyTypes: string[];
  spawnMultiplier: number; // Difficulty multiplier for this biome
  description: string;
}

export class BiomeManager {
  // Biome cycle duration in milliseconds (10 minutes = 600,000ms)
  public static readonly BIOME_CYCLE_TIME: number = 10 * 60 * 1000; // 10 minutes
  
  // All available biomes in order
  public static readonly BIOME_CONFIGS: { [key in BiomeType]: BiomeConfig } = {
    [BiomeType.JUNGLE]: {
      name: BiomeType.JUNGLE,
      displayName: "Tropical Jungle",
      backgroundKey: "jungle_background",
      musicKey: "jungle_battle_theme",
      tilemapKey: "jungle_level_1",
      tilesetKey: "jungle_ground_tileset",
      enemyTypes: ["jungle_soldier"],
      spawnMultiplier: 1.0,
      description: "Dense tropical jungle with thick vegetation and hidden dangers"
    },
    [BiomeType.DESERT]: {
      name: BiomeType.DESERT,
      displayName: "Desert Wasteland",
      backgroundKey: "desert_background",
      musicKey: "desert_battle_theme",
      tilemapKey: "desert_level_1",
      tilesetKey: "desert_ground_tileset", 
      enemyTypes: ["desert_trooper"],
      spawnMultiplier: 1.1,
      description: "Arid wasteland with sand dunes and rocky outcrops"
    },
    [BiomeType.URBAN_RUINS]: {
      name: BiomeType.URBAN_RUINS,
      displayName: "Ruined City",
      backgroundKey: "ruined_city_background",
      musicKey: "urban_assault_theme",
      tilemapKey: "urban_ruins_level_1",
      tilesetKey: "urban_ruins_tileset",
      enemyTypes: ["urban_sniper"],
      spawnMultiplier: 1.2,
      description: "Post-apocalyptic urban ruins with collapsed buildings"
    },
    [BiomeType.ARCTIC_BATTLEFIELD]: {
      name: BiomeType.ARCTIC_BATTLEFIELD,
      displayName: "Arctic Battlefield",
      backgroundKey: "snow_battlefield_background",
      musicKey: "arctic_warfare_theme",
      tilemapKey: "arctic_battlefield_level_1",
      tilesetKey: "snow_ground_tileset",
      enemyTypes: ["arctic_soldier"],
      spawnMultiplier: 1.3,
      description: "Frozen battlefield with ice formations and snow-covered terrain"
    },
    [BiomeType.DEEP_SPACE]: {
      name: BiomeType.DEEP_SPACE,
      displayName: "Deep Space Station",
      backgroundKey: "deep_space_background",
      musicKey: "space_battle_theme",
      tilemapKey: "space_station_level_1",
      tilesetKey: "space_platform_tileset",
      enemyTypes: ["space_cyborg"],
      spawnMultiplier: 1.5,
      description: "Futuristic space station with metal platforms and energy systems"
    }
  };

  // Biome cycle order
  public static readonly BIOME_ORDER: BiomeType[] = [
    BiomeType.JUNGLE,
    BiomeType.DESERT,
    BiomeType.URBAN_RUINS,
    BiomeType.ARCTIC_BATTLEFIELD,
    BiomeType.DEEP_SPACE
  ];

  private currentBiomeIndex: number = 0;
  private biomeStartTime: number = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.biomeStartTime = Date.now();
  }

  /**
   * Get the current biome configuration
   */
  getCurrentBiome(): BiomeConfig {
    const currentBiomeType = BiomeManager.BIOME_ORDER[this.currentBiomeIndex];
    return BiomeManager.BIOME_CONFIGS[currentBiomeType];
  }

  /**
   * Get the next biome configuration
   */
  getNextBiome(): BiomeConfig {
    const nextIndex = (this.currentBiomeIndex + 1) % BiomeManager.BIOME_ORDER.length;
    const nextBiomeType = BiomeManager.BIOME_ORDER[nextIndex];
    return BiomeManager.BIOME_CONFIGS[nextBiomeType];
  }

  /**
   * Get time remaining in current biome (in milliseconds)
   */
  getTimeRemainingInBiome(): number {
    const elapsed = Date.now() - this.biomeStartTime;
    return Math.max(0, BiomeManager.BIOME_CYCLE_TIME - elapsed);
  }

  /**
   * Get time remaining in current biome (in seconds)
   */
  getTimeRemainingInBiomeSeconds(): number {
    return Math.floor(this.getTimeRemainingInBiome() / 1000);
  }

  /**
   * Get progress through current biome (0-1)
   */
  getBiomeProgress(): number {
    const elapsed = Date.now() - this.biomeStartTime;
    return Math.min(1, elapsed / BiomeManager.BIOME_CYCLE_TIME);
  }

  /**
   * Check if it's time to cycle to the next biome
   */
  shouldCycleBiome(): boolean {
    return this.getTimeRemainingInBiome() <= 0;
  }

  /**
   * Cycle to the next biome
   * Returns true if biome changed, false if no change
   */
  cycleToNextBiome(): boolean {
    if (!this.shouldCycleBiome()) {
      return false;
    }

    this.currentBiomeIndex = (this.currentBiomeIndex + 1) % BiomeManager.BIOME_ORDER.length;
    this.biomeStartTime = Date.now();
    
    console.log(`Biome changed to: ${this.getCurrentBiome().displayName}`);
    return true;
  }

  /**
   * Force cycle to next biome (for testing or special events)
   */
  forceNextBiome(): BiomeConfig {
    this.currentBiomeIndex = (this.currentBiomeIndex + 1) % BiomeManager.BIOME_ORDER.length;
    this.biomeStartTime = Date.now();
    
    console.log(`Force biome change to: ${this.getCurrentBiome().displayName}`);
    return this.getCurrentBiome();
  }

  /**
   * Get biome by type
   */
  static getBiomeConfig(biomeType: BiomeType): BiomeConfig {
    return BiomeManager.BIOME_CONFIGS[biomeType];
  }

  /**
   * Get current biome cycle number (how many complete cycles have occurred)
   */
  getCurrentCycle(): number {
    return Math.floor(this.currentBiomeIndex / BiomeManager.BIOME_ORDER.length);
  }

  /**
   * Get overall difficulty multiplier based on current cycle
   * Each complete cycle increases difficulty
   */
  getDifficultyMultiplier(): number {
    const cycleNumber = this.getCurrentCycle();
    const baseDifficulty = this.getCurrentBiome().spawnMultiplier;
    
    // Increase difficulty by 10% per cycle
    const cycleMultiplier = 1 + (cycleNumber * 0.1);
    
    return baseDifficulty * cycleMultiplier;
  }

  /**
   * Reset biome manager to initial state
   */
  reset(): void {
    this.currentBiomeIndex = 0;
    this.biomeStartTime = Date.now();
  }

  /**
   * Get formatted time remaining string
   */
  getFormattedTimeRemaining(): string {
    const timeRemaining = this.getTimeRemainingInBiomeSeconds();
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}