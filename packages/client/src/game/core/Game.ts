import * as PIXI from 'pixi.js';
import { createWorldBoundary } from '../../utils/Boundary';
import { FoodManager } from '../food/FoodManager';
import { Camera } from '../Camera';
import { GameSettings } from '../../SettingsManager';
import { config, JoinAcceptedPayload } from 'shared';

import { NetworkManager } from '../NetworkManager';
import { OptimizedCollisionManager } from '../OptimizedCollisionManager';

import { GameState } from './GameState';
import { InputManager } from './InputManager';
import { GameUI } from './GameUI';
import { CollisionHandler } from './CollisionHandler';
import { GameCleanup } from './GameCleanup';
import { CameraController } from './CameraController';
import { NetworkEventHandler } from './NetworkEventHandler';
import { GameWorldUpdater } from './GameWorldUpdater';
import { GameLoop } from './GameLoop';

import { BackgroundShapes } from './BackgroundShapes';
import { Leaderboard } from './Leaderboard';
import { Minimap } from './Minimap';
import { CashOutDialog, CashOutDialogData } from './CashOutDialog';

const { WORLD_RADIUS } = config;

interface GameOptions {
    settings: GameSettings;
    onGameOver: () => void;
    username: string;
}

export class Game {
    private app: PIXI.Application;
    private camera: Camera;
    private worldContainer: PIXI.Container;
    private boundaryContainer: PIXI.Container;
    private foodManager!: FoodManager;
    private networkManager!: NetworkManager;
    private options: GameOptions;
    private collisionManager: OptimizedCollisionManager;

    private gameState: GameState;
    private inputManager: InputManager;
    private gameUI: GameUI;
    private collisionHandler!: CollisionHandler;
    private gameCleanup: GameCleanup;
    private cameraController: CameraController;

    private backgroundShapes!: BackgroundShapes;

    private networkEventHandler!: NetworkEventHandler;
    private gameWorldUpdater!: GameWorldUpdater;
    private gameLoop!: GameLoop;

    private minimap: Minimap;
    private leaderboard: Leaderboard;

    // Layer containers for proper Z-ordering
    private backgroundLayer!: PIXI.Container;
    private backgroundShapesLayer!: PIXI.Container;
    private foodLayer!: PIXI.Container;
    private snakeLayer!: PIXI.Container;
    private boundaryLayer!: PIXI.Container;
    private uiLayer!: PIXI.Container;

    private cashOutDialog: CashOutDialog;



    constructor(options: GameOptions) {
        this.options = options;

        this.app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });


        this.app.renderer.background.color = 0x000000; //0x191527;
        this.camera = new Camera(this.app);
        this.worldContainer = this.camera.getWorldContainer();

        // Create layered containers with proper Z-index ordering
        this.setupLayeredContainers();

        // Create UI elements that should be above everything
        this.minimap = new Minimap(this.app);
        this.leaderboard = new Leaderboard(this.app);

        this.cashOutDialog = new CashOutDialog(this.app);

        // Setup cash out dialog callbacks
        this.cashOutDialog.onHome(() => {
            this.options.onGameOver();
        });

        this.cashOutDialog.onWithdraw(() => {
            // Handle withdraw action here
            console.log('Withdraw clicked');
            // You can add actual withdraw logic here
            this.options.onGameOver();
        });
        // Create boundary and add to boundary layer
        this.boundaryContainer = new PIXI.Container();
        const boundary = createWorldBoundary(WORLD_RADIUS);
        this.boundaryContainer.addChild(boundary);
        this.boundaryLayer.addChild(this.boundaryContainer);

        this.collisionManager = new OptimizedCollisionManager(WORLD_RADIUS);
        this.gameState = new GameState();

        // Pass worldContainer to InputManager for cash out system
        this.inputManager = new InputManager(this.app, this.worldContainer);

        this.gameUI = new GameUI(this.app);
        this.cameraController = new CameraController(this.camera);
        this.gameCleanup = new GameCleanup(this.app, this.gameState, this.collisionManager, options.onGameOver);

        // Setup cash out completion callback
        this.inputManager.getCashOutManager().onCashOutCompleted(() => {
            this.handleCashOut();
        });

        window.dispatchEvent(new Event('resize'));
    }

    private setupLayeredContainers(): void {
        // Create all layer containers
        this.backgroundLayer = new PIXI.Container();
        this.backgroundShapesLayer = new PIXI.Container();
        this.foodLayer = new PIXI.Container();
        this.snakeLayer = new PIXI.Container();
        this.boundaryLayer = new PIXI.Container();
        this.uiLayer = new PIXI.Container();

        // Set Z-index values for proper layering
        this.backgroundLayer.zIndex = -100;
        this.backgroundShapesLayer.zIndex = -50;
        this.foodLayer.zIndex = 0;
        this.snakeLayer.zIndex = 50;
        this.boundaryLayer.zIndex = 100;
        this.uiLayer.zIndex = 1000;

        // Add all layers to world container
        this.worldContainer.addChild(this.backgroundLayer);
        //this.worldContainer.addChild(this.backgroundShapesLayer);
        this.worldContainer.addChild(this.foodLayer);
        this.worldContainer.addChild(this.snakeLayer);
        this.worldContainer.addChild(this.boundaryLayer);

        // UI layer goes directly to app stage (not world container) since it shouldn't be affected by camera
        this.app.stage.addChild(this.uiLayer);

        // Enable sorting by zIndex for world container
        this.worldContainer.sortableChildren = true;
        this.app.stage.sortableChildren = true;
    }

    public async init(slitherAmount: number): Promise<void> {
        await new Promise(resolve => requestAnimationFrame(resolve as any));
        this.gameUI.updateConnectionStatus("Connecting...");

        // Initialize food manager and add to food layer
        this.foodManager = new FoodManager();
        this.foodLayer.addChild(this.foodManager.getContainer());

        // Initialize background shapes and add to background shapes layer
        this.backgroundShapes = new BackgroundShapes(this.app.renderer as PIXI.Renderer);
        this.backgroundShapesLayer.addChild(this.backgroundShapes.getContainer());

        this.networkManager = new NetworkManager();
        this.collisionHandler = new CollisionHandler(this.gameState, this.collisionManager, this.networkManager);
        this.gameWorldUpdater = new GameWorldUpdater(this.gameState, this.foodManager, this.cameraController, this.camera);
        this.gameLoop = new GameLoop(this.gameState, this.inputManager, this.collisionHandler, this.gameWorldUpdater, this.networkManager);

        this.networkEventHandler = new NetworkEventHandler(
            this.gameState,
            this.foodManager,
            this.gameUI,
            this.snakeLayer,
            this.app,
            this.minimap,
            this.leaderboard,
            () => this.handleSnakeDeath()
        );

        this.setupNetworkListeners();

        try {
            const amount = Number(slitherAmount)
            console.log(slitherAmount)
            await this.networkManager.connect(config.SERVER_URL);
            this.networkManager.sendJoin(this.options.username, amount);
        } catch (err) {
            console.error("Failed to connect:", err);
            this.gameUI.updateConnectionStatus("Connection Failed");
        }
    }

    private setupNetworkListeners(): void {
        this.networkManager.onJoinAccepted = (payload: JoinAcceptedPayload) => {
            this.networkEventHandler.handleJoinAccepted(payload);

            if (this.gameState.myPlayerId) {
                this.start();
            }
        };

        this.networkManager.onStateUpdate = this.networkEventHandler.handleStateUpdate.bind(this.networkEventHandler);
        this.networkManager.onPlayerDied = this.networkEventHandler.handlePlayerDied.bind(this.networkEventHandler);
        this.networkManager.onPlayerJoined = this.networkEventHandler.handlePlayerJoined.bind(this.networkEventHandler);
        this.networkManager.onFoodSpawned = this.networkEventHandler.handleFoodSpawned.bind(this.networkEventHandler);
        this.networkManager.onFoodEaten = this.networkEventHandler.handleFoodEaten.bind(this.networkEventHandler);

        this.networkManager.onKillFeed = this.networkEventHandler.handleKillFeed.bind(this.networkEventHandler);

        this.networkManager.onDisconnect = () => {
            this.networkEventHandler.handleDisconnect();

            if (!this.gameState.isGameOver) {
                this.handleSnakeDeath();
            }
        };

        this.networkManager.onPong = this.networkEventHandler.handlePong.bind(this.networkEventHandler);
    }

    private start(): void {
        if (this.gameState.isRunning) return;

        this.gameState.setGameStartTime();
        this.gameState.isRunning = true;
        this.inputManager.setup(this.options.settings.controlMode, this.gameState.playerSnake);
        this.app.ticker.add(this.tick, this);

        const pingInterval = setInterval(() => {
            if (this.networkManager.isConnected()) {
                this.networkManager.sendPing();
            }
        }, 2000);
        this.gameCleanup.setPingInterval(pingInterval);
    }

    private tick(delta: number): void {
        if (!this.gameState.isRunning) return;

        if (this.backgroundShapes) {
            this.backgroundShapes.update(delta, this.camera.view);
        }
        try {
            this.gameLoop.update(delta, this.app);
        } catch (error) {
            console.error("Critical error in game loop:", error);

            if (this.gameState.playerSnake && !this.gameState.playerSnake.collided) {
                this.collisionHandler.checkPlayerCollisions();
            }
        }
    }

    private handleSnakeDeath(): void {
        if (this.gameState.isGameOver) return;

        console.log("Handling local player death sequence...");

        if (this.gameState.playerSnake && !this.gameState.playerSnake.collided) {
            this.gameState.playerSnake.snakeCollided();
            this.gameState.deathPosition = this.gameState.playerSnake.getHeadPosition();
        }

        this.collisionHandler.triggerGameOver();
        this.gameCleanup.cleanup();
    }

    private handleCashOut(): void {

        // Calculate game stats for the dialog
        const gameTimeSeconds = this.calculateGameTime();


        const profit = this.getPlayerCash() - this.gameState.getStartingAmount()

        const dialogData: CashOutDialogData = {
            won: profit < 0,
            rank: this.leaderboard.getPlayerRank(), // You can get this from leaderboard or server
            winLose: this.getPlayerCash(), // Get from your snake or game state
            length: this.gameState.playerSnake?.getLength() || 0,
            time: gameTimeSeconds,
            kills: this.getPlayerKills() // Get from your snake or game state
        };

        // Show cash out dialog instead of immediately ending game
        this.cashOutDialog.show(dialogData);

        // Stop the game but don't trigger cleanup yet
        this.gameState.isGameOver = true;
        this.app.ticker.remove(this.tick, this);
        this.gameState.isRunning = false;

        // Send cash out message to server (if you have this functionality)
        // this.networkManager.sendCashOut();
    }

    private calculateGameTime(): number {
        return this.gameState.getGameDurationSeconds();
    }

    // Helper methods to get player stats
    private getPlayerCash(): number {
        return this.gameUI.getPlayerStats().getCurrentCash() || 0;
    }

    private getPlayerKills(): number {
        // If your snake has a kills property, use that
        // Otherwise, get from game UI or wherever you track kills
        return this.gameUI.getPlayerStats().getCurrentKills() || 0;
    }

    public getApp(): PIXI.Application {
        return this.app;
    }

    // Getter methods for layer access (if needed by other components)
    public getSnakeLayer(): PIXI.Container {
        return this.snakeLayer;
    }

    public getFoodLayer(): PIXI.Container {
        return this.foodLayer;
    }

    public getBoundaryLayer(): PIXI.Container {
        return this.boundaryLayer;
    }

    public getBackgroundLayer(): PIXI.Container {
        return this.backgroundLayer;
    }

    public getBackgroundShapesLayer(): PIXI.Container {
        return this.backgroundShapesLayer;
    }

    public getUILayer(): PIXI.Container {
        return this.uiLayer;
    }

    public destroy(): void {
        this.gameCleanup.destroy();
        if (this.backgroundShapes) {
            this.backgroundShapes.destroy();
        }
        if (this.networkManager) {
            this.networkManager.disconnect();
        }
        if (this.minimap) {
            this.minimap.destroy();
        }
        if (this.leaderboard) {
            this.leaderboard.destroy();
        }
        if (this.inputManager) {
            this.inputManager.destroy();
        }
        if (this.gameUI) {
            this.gameUI.destroy();
        }
        if (this.cashOutDialog) {
            this.cashOutDialog.destroy();
        }
    }
}