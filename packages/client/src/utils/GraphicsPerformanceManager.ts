
import { GraphicsObjectPool } from './GraphicsObjectPool';
import { BatchUpdateManager } from './BatchUpdateManager';
import { VisualCullingManager } from './VisualCullingManager';
import * as PIXI from 'pixi.js';

export class GraphicsPerformanceManager {
    public objectPool: GraphicsObjectPool;
    public batchUpdater: BatchUpdateManager;
    public cullingManager: VisualCullingManager;
    
    private lastPerformanceCheck: number = 0;
    private frameTimeHistory: number[] = [];
    private readonly PERFORMANCE_CHECK_INTERVAL = 1000; 
    private readonly MAX_FRAME_HISTORY = 60; 
    
    private performanceMode: 'auto' | 'high' | 'balanced' | 'performance' = 'auto';
    private targetFPS: number = 60;
    private currentFPS: number = 60;
    
    constructor() {
        this.objectPool = new GraphicsObjectPool();
        this.batchUpdater = new BatchUpdateManager();
        this.cullingManager = new VisualCullingManager();
    }

    public update(deltaTime: number, viewBounds: PIXI.Rectangle, forceUpdate: boolean = false): void {
        const currentTime = performance.now();
        
        this.updateFrameTimeHistory(deltaTime);
        
        this.cullingManager.updateViewBounds(viewBounds);
        
        this.cullingManager.update(currentTime, forceUpdate);
        
        this.batchUpdater.processUpdates(forceUpdate);
        
        if (currentTime - this.lastPerformanceCheck > this.PERFORMANCE_CHECK_INTERVAL) {
            this.checkPerformanceAndAdjust();
            this.lastPerformanceCheck = currentTime;
        }
    }

    public createSprite(texture: PIXI.Texture, textureKey: string = 'default'): PIXI.Sprite {
        return this.objectPool.acquireSprite(texture, textureKey);
    }

    public destroySprite(sprite: PIXI.Sprite): void {
        this.objectPool.releaseSprite(sprite);
    }

    public createContainer(): PIXI.Container {
        return this.objectPool.acquireContainer();
    }

    public destroyContainer(container: PIXI.Container): void {
        this.objectPool.releaseContainer(container);
    }

    public createGraphics(): PIXI.Graphics {
        return this.objectPool.acquireGraphics();
    }

    public destroyGraphics(graphics: PIXI.Graphics): void {
        this.objectPool.releaseGraphics(graphics);
    }

    public updateSpritePosition(sprite: PIXI.Sprite, x: number, y: number): void {
        this.batchUpdater.queuePositionUpdate(sprite, x, y);
    }

    public updateSpriteScale(sprite: PIXI.Sprite, scale: number): void {
        this.batchUpdater.queueScaleUpdate(sprite, scale);
    }

    public updateSpriteVisibility(sprite: PIXI.Sprite, visible: boolean): void {
        this.batchUpdater.queueVisibilityUpdate(sprite, visible);
    }

    public updateSprite(
        sprite: PIXI.Sprite,
        updates: {
            x?: number;
            y?: number;
            scaleX?: number;
            scaleY?: number;
            rotation?: number;
            alpha?: number;
            visible?: boolean;
            tint?: number;
        }
    ): void {
        this.batchUpdater.queueSpriteUpdate(sprite, updates);
    }

    public registerForCulling(
        id: string,
        displayObject: PIXI.DisplayObject,
        x: number,
        y: number,
        radius: number,
        priority: 'high' | 'medium' | 'low' = 'medium'
    ): void {
        this.cullingManager.registerObject(id, displayObject, x, y, radius, priority);
    }

    public updateCullingPosition(id: string, x: number, y: number): void {
        this.cullingManager.updateObjectPosition(id, x, y);
    }

    public unregisterFromCulling(id: string): void {
        this.cullingManager.unregisterObject(id);
    }

    public updateMultipleSpritePositions(updates: Array<{ sprite: PIXI.Sprite; x: number; y: number }>): void {
        const bulkUpdates = updates.map(u => ({ obj: u.sprite, x: u.x, y: u.y }));
        this.batchUpdater.queueBulkPositionUpdates(bulkUpdates);
    }

    public updateMultipleSpriteVisibility(updates: Array<{ sprite: PIXI.Sprite; visible: boolean }>): void {
        const bulkUpdates = updates.map(u => ({ obj: u.sprite, visible: u.visible }));
        this.batchUpdater.queueBulkVisibilityUpdates(bulkUpdates);
    }

    private updateFrameTimeHistory(deltaTime: number): void {
        const frameTime = deltaTime / 16.67; 
        this.frameTimeHistory.push(frameTime);
        
        if (this.frameTimeHistory.length > this.MAX_FRAME_HISTORY) {
            this.frameTimeHistory.shift();
        }
        
        if (this.frameTimeHistory.length >= 10) {
            const avgFrameTime = this.frameTimeHistory.slice(-10).reduce((a, b) => a + b) / 10;
            this.currentFPS = Math.round(1000 / (avgFrameTime * 16.67));
        }
    }

    private checkPerformanceAndAdjust(): void {
        if (this.performanceMode !== 'auto') return;

        const avgFrameTime = this.frameTimeHistory.length > 0 ? 
            this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length : 1;
        
        const targetFrameTime = 1000 / this.targetFPS / 16.67; 
        
        if (avgFrameTime > targetFrameTime * 1.2) {
            
            this.enablePerformanceOptimizations();
        } else if (avgFrameTime < targetFrameTime * 0.8) {
            
            this.enableQualityOptimizations();
        }
    }

    private enablePerformanceOptimizations(): void {
        console.log('Enabling performance optimizations due to low FPS:', this.currentFPS);
        
        this.cullingManager.enablePerformanceMode();
        
        this.batchUpdater.processPriorityUpdates();
    }

    private enableQualityOptimizations(): void {
        
        this.cullingManager.disablePerformanceMode();
    }

    public setPerformanceMode(mode: 'auto' | 'high' | 'balanced' | 'performance'): void {
        this.performanceMode = mode;
        
        switch (mode) {
            case 'high':
                this.targetFPS = 60;
                this.cullingManager.disablePerformanceMode();
                break;
            case 'balanced':
                this.targetFPS = 45;
                break;
            case 'performance':
                this.targetFPS = 30;
                this.cullingManager.enablePerformanceMode();
                break;
            case 'auto':
                this.targetFPS = 60;
                break;
        }
    }

    public emergencyPerformanceMode(): void {
        console.log('Emergency performance mode activated');
        
        this.batchUpdater.processPriorityUpdates();
        
        this.cullingManager.performPriorityCulling();
        
        this.batchUpdater.clearAll();
    }

    public forceImmediateUpdate(): void {
        this.batchUpdater.processUpdates(true);
        this.cullingManager.update(performance.now(), true);
    }

    public getPerformanceStats(): {
        fps: number;
        frameTimeHistory: number[];
        performanceMode: string;
        poolStats: any;
        batchStats: any;
        cullingStats: any;
        memoryUsage: number;
    } {
        return {
            fps: this.currentFPS,
            frameTimeHistory: [...this.frameTimeHistory],
            performanceMode: this.performanceMode,
            poolStats: this.objectPool.getPoolStats(),
            batchStats: this.batchUpdater.getStats(),
            cullingStats: this.cullingManager.getStats(),
            memoryUsage: this.objectPool.getPoolStats().totalMemoryUsage
        };
    }

    public destroy(): void {
        this.objectPool.destroy();
        this.batchUpdater.clearAll();
        this.cullingManager.clear();
        this.frameTimeHistory = [];
    }

    public logPerformanceReport(): void {
        const stats = this.getPerformanceStats();
        console.group('Graphics Performance Report');
        console.log('Current FPS:', stats.fps);
        console.log('Performance Mode:', stats.performanceMode);
        console.log('Memory Usage:', (stats.memoryUsage / 1024).toFixed(2), 'KB');
        console.log('Pool Stats:', stats.poolStats);
        console.log('Batch Stats:', stats.batchStats);
        console.log('Culling Stats:', stats.cullingStats);
        console.groupEnd();
    }
}