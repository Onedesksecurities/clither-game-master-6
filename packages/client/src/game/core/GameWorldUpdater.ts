import { GameState } from './GameState';
import { FoodManager } from '../food/FoodManager';
import { CameraController } from './CameraController';
import { Camera } from '../Camera';
import * as PIXI from 'pixi.js';

export class GameWorldUpdater {
    private gameState: GameState;
    private foodManager: FoodManager;
    private cameraController: CameraController;
    private camera: Camera;

    constructor(gameState: GameState, foodManager: FoodManager, cameraController: CameraController, camera: Camera) {
        this.gameState = gameState;
        this.foodManager = foodManager;
        this.cameraController = cameraController;
        this.camera = camera;
    }

    public update(deltaTime: number, app: PIXI.Application): void {
        
        this.updateOtherSnakes(deltaTime, app);

        this.updateDeadPlayerSnake(deltaTime, app);

        this.updateFoodManager(deltaTime);

        this.updateCamera();
    }

    private updateOtherSnakes(deltaTime: number, app: PIXI.Application): void {
        this.gameState.otherSnakes.forEach(snake => {
            if (snake.id !== this.gameState.myPlayerId) {
                try {
                    snake.update(false, this.cameraController.getCurrentZoom(), deltaTime, 0, app.screen);
                } catch (error) {
                    console.error(`Error updating snake ${snake.id}:`, error);
                }
            }
        });
    }

    private updateDeadPlayerSnake(deltaTime: number, app: PIXI.Application): void {
        if (this.gameState.playerSnake && this.gameState.playerSnake.collided && !this.gameState.isGameOver) {
            try {
                this.gameState.playerSnake.update(true, this.cameraController.getCurrentZoom(), deltaTime, 0, app.screen);
            } catch (error) {
                console.error("Error updating dead player snake:", error);
            }
        }
    }

    private updateFoodManager(deltaTime: number): void {
        try {
            const allSnakes = new Map(this.gameState.otherSnakes);
            if (this.gameState.playerSnake && !this.gameState.isGameOver) {
                allSnakes.set(this.gameState.myPlayerId!, this.gameState.playerSnake);
            }
            this.foodManager.update(allSnakes, this.camera.view, deltaTime);
        } catch (error) {
            console.error("Error updating food manager:", error);
        }
    }

    private updateCamera(): void {
        this.cameraController.update(
            this.gameState.playerSnake,
            this.gameState.deathPosition,
            this.gameState.isGameOver
        );
    }
}