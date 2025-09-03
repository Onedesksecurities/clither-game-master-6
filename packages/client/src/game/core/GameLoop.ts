import { GameState } from './GameState';
import { InputManager } from './InputManager';
import { CollisionHandler } from './CollisionHandler';
import { GameWorldUpdater } from './GameWorldUpdater';
import { NetworkManager } from '../NetworkManager';
import * as PIXI from 'pixi.js';

export class GameLoop {
    private gameState: GameState;
    private inputManager: InputManager;
    private collisionHandler: CollisionHandler;
    private worldUpdater: GameWorldUpdater;
    private networkManager: NetworkManager;

    constructor(
        gameState: GameState,
        inputManager: InputManager,
        collisionHandler: CollisionHandler,
        worldUpdater: GameWorldUpdater,
        networkManager: NetworkManager
    ) {
        this.gameState = gameState;
        this.inputManager = inputManager;
        this.collisionHandler = collisionHandler;
        this.worldUpdater = worldUpdater;
        this.networkManager = networkManager;
    }

    public update(deltaTime: number, app: PIXI.Application): void {
        if (!this.gameState.playerSnake) return;

        this.collisionHandler.cleanupExpiredCollisionReports();

        this.inputManager.update();
        
        this.updatePlayer(deltaTime, app);

        this.worldUpdater.update(deltaTime, app);
    }

    private updatePlayer(deltaTime: number, app: PIXI.Application): void {
        const isPlayerAlive = !this.gameState.isGameOver && 
                             this.gameState.playerSnake && 
                             !this.gameState.playerSnake.collided;

        if (isPlayerAlive) {
            const input = {
                targetAngle: this.gameState.playerSnake.getTargetAngle(),
                isBoosting: this.inputManager.isBoostActive(),
                sequence: this.gameState.getNextInputSequence()
            };

            const cashOutManager = this.inputManager.getCashOutManager();
            if (!cashOutManager.isInProgress()) {
                this.networkManager.sendInput(input.targetAngle, input.isBoosting, input.sequence);
                this.gameState.addPendingInput(input);
            }

            this.gameState.playerSnake.applyInput(input);
            this.gameState.playerSnake.update(
                true, 
                this.worldUpdater['cameraController'].getCurrentZoom(), 
                deltaTime, 
                this.inputManager.getJoystickDistance(), 
                app.screen
            );

            this.collisionHandler.checkPlayerCollisions();
        }
    }
}