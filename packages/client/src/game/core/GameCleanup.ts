import { GraphicsUtils } from '../../utils/Graphics';
import { OptimizedCollisionManager } from '../OptimizedCollisionManager';
import { GameState } from './GameState';
import * as PIXI from 'pixi.js';

export class GameCleanup {
    private app: PIXI.Application;
    private gameState: GameState;
    private collisionManager: OptimizedCollisionManager;
    private pingInterval: any = null;
    private onGameOver: () => void;

    constructor(
        app: PIXI.Application, 
        gameState: GameState, 
        collisionManager: OptimizedCollisionManager,
        onGameOver: () => void
    ) {
        this.app = app;
        this.gameState = gameState;
        this.collisionManager = collisionManager;
        this.onGameOver = onGameOver;
    }

    public setPingInterval(interval: any): void {
        this.pingInterval = interval;
    }

    public cleanup(): void {
        console.log("Cleaning up game...");
        
        setTimeout(() => {
            this.app.ticker.remove(this.tick, this);
            this.gameState.isRunning = false;
            this.finalCleanup();
        }, 1200);
    }

    public destroy(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        this.collisionManager.destroy();
        this.gameState.clearCollisionData();

        window.onresize = null;
        this.app.ticker.remove(this.tick, this);
        GraphicsUtils.clearCache();
        if (this.app.stage) {
            this.app.destroy(true, { children: true, texture: true, baseTexture: true });
        }
    }

    private finalCleanup(): void {
        this.onGameOver();
    }

    
    private tick(): void {
        
    }
}