import Phaser from "phaser";
import { screenSize, debugConfig, renderConfig } from "./gameConfig.json";
import "./styles/tailwind.css";
import { Preloader } from "./scenes/Preloader";
import { TitleScreen } from "./scenes/TitleScreen";
import { JungleScene } from "./scenes/JungleScene";
import { InfiniteSurvivalScene } from "./scenes/InfiniteSurvivalScene";
import { UIScene } from "./scenes/UIScene";
import { VictoryUIScene } from "./scenes/VictoryUIScene";
import { GameCompleteUIScene } from "./scenes/GameCompleteUIScene";
import { GameOverUIScene } from "./scenes/GameOverUIScene";
import { LeaderboardScene } from "./scenes/LeaderboardScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: screenSize.width.value,
  height: screenSize.height.value,
  backgroundColor: "#000000",
  parent: 'game-container',
  dom: {
    createContainer: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      fps: 120,
      debug: debugConfig.debug.value,
      debugShowBody: debugConfig.debug.value,
      debugShowStaticBody: debugConfig.debug.value,
      debugShowVelocity: debugConfig.debug.value,
    },
  },
  pixelArt: renderConfig.pixelArt.value,
};

const game = new Phaser.Game(config);
// Strictly add scenes in the following order: Preloader, TitleScreen, level scenes, UI-related scenes

// Preloader: Load minimal title screen assets only (FAST!)
game.scene.add("Preloader", Preloader, true);

// BackgroundLoader: Loads game assets silently in background
game.scene.add("BackgroundLoader", BackgroundLoader);

// TitleScreen
game.scene.add("TitleScreen", TitleScreen);

// Level scenes
game.scene.add("JungleScene", JungleScene);
game.scene.add("InfiniteSurvivalScene", InfiniteSurvivalScene);

// UI-related scenes
game.scene.add("UIScene", UIScene);
game.scene.add("VictoryUIScene", VictoryUIScene);
game.scene.add("GameCompleteUIScene", GameCompleteUIScene);
game.scene.add("GameOverUIScene", GameOverUIScene);
game.scene.add("LeaderboardScene", LeaderboardScene);
