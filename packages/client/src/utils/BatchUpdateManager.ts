
import * as PIXI from 'pixi.js';

interface SpriteUpdate {
    sprite: PIXI.Sprite;
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    alpha?: number;
    visible?: boolean;
    tint?: number;
}

interface ContainerUpdate {
    container: PIXI.Container;
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    alpha?: number;
    visible?: boolean;
}

export class BatchUpdateManager {
    private spriteUpdates: SpriteUpdate[] = [];
    private containerUpdates: ContainerUpdate[] = [];
    private pendingUpdates: Set<PIXI.DisplayObject> = new Set();
    
    private readonly MAX_BATCH_SIZE = 500; 
    private lastUpdateTime = 0;
    private readonly UPDATE_INTERVAL = 16; 
    
    private positionBuffer: { obj: PIXI.DisplayObject; x: number; y: number }[] = [];
    private scaleBuffer: { obj: PIXI.DisplayObject; scaleX: number; scaleY: number }[] = [];
    private visibilityBuffer: { obj: PIXI.DisplayObject; visible: boolean }[] = [];

    public queueSpriteUpdate(
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
        if (this.pendingUpdates.has(sprite)) {
            
            const existingUpdate = this.spriteUpdates.find(u => u.sprite === sprite);
            if (existingUpdate) {
                Object.assign(existingUpdate, updates);
                return;
            }
        }

        this.spriteUpdates.push({ sprite, ...updates });
        this.pendingUpdates.add(sprite);
    }

    public queueContainerUpdate(
        container: PIXI.Container,
        updates: {
            x?: number;
            y?: number;
            scaleX?: number;
            scaleY?: number;
            rotation?: number;
            alpha?: number;
            visible?: boolean;
        }
    ): void {
        if (this.pendingUpdates.has(container)) {
            const existingUpdate = this.containerUpdates.find(u => u.container === container);
            if (existingUpdate) {
                Object.assign(existingUpdate, updates);
                return;
            }
        }

        this.containerUpdates.push({ container, ...updates });
        this.pendingUpdates.add(container);
    }

    public queuePositionUpdate(obj: PIXI.DisplayObject, x: number, y: number): void {
        
        const existing = this.positionBuffer.find(item => item.obj === obj);
        if (existing) {
            existing.x = x;
            existing.y = y;
        } else {
            this.positionBuffer.push({ obj, x, y });
        }
    }

    public queueScaleUpdate(obj: PIXI.DisplayObject, scaleX: number, scaleY?: number): void {
        scaleY = scaleY ?? scaleX;
        const existing = this.scaleBuffer.find(item => item.obj === obj);
        if (existing) {
            existing.scaleX = scaleX;
            existing.scaleY = scaleY;
        } else {
            this.scaleBuffer.push({ obj, scaleX, scaleY });
        }
    }

    public queueVisibilityUpdate(obj: PIXI.DisplayObject, visible: boolean): void {
        const existing = this.visibilityBuffer.find(item => item.obj === obj);
        if (existing) {
            existing.visible = visible;
        } else {
            this.visibilityBuffer.push({ obj, visible });
        }
    }

    public processUpdates(forceUpdate: boolean = false): void {
        const now = performance.now();
        if (!forceUpdate && now - this.lastUpdateTime < this.UPDATE_INTERVAL) {
            return; 
        }

        this.lastUpdateTime = now;

        this.processPositionUpdates();
        
        this.processScaleUpdates();
        
        this.processVisibilityUpdates();

        this.processSpriteUpdates();
        
        this.processContainerUpdates();

        this.clearProcessedUpdates();
    }

    private processPositionUpdates(): void {
        for (let i = 0; i < this.positionBuffer.length; i++) {
            const update = this.positionBuffer[i];
            update.obj.position.set(update.x, update.y);
        }
        this.positionBuffer.length = 0;
    }

    private processScaleUpdates(): void {
        for (let i = 0; i < this.scaleBuffer.length; i++) {
            const update = this.scaleBuffer[i];
            update.obj.scale.set(update.scaleX, update.scaleY);
        }
        this.scaleBuffer.length = 0;
    }

    private processVisibilityUpdates(): void {
        for (let i = 0; i < this.visibilityBuffer.length; i++) {
            const update = this.visibilityBuffer[i];
            update.obj.visible = update.visible;
        }
        this.visibilityBuffer.length = 0;
    }

    private processSpriteUpdates(): void {
        const batchSize = Math.min(this.spriteUpdates.length, this.MAX_BATCH_SIZE);
        
        for (let i = 0; i < batchSize; i++) {
            const update = this.spriteUpdates[i];
            const sprite = update.sprite;
            
            if (update.x !== undefined || update.y !== undefined) {
                sprite.position.set(
                    update.x !== undefined ? update.x : sprite.x,
                    update.y !== undefined ? update.y : sprite.y
                );
            }
            
            if (update.scaleX !== undefined || update.scaleY !== undefined) {
                sprite.scale.set(
                    update.scaleX !== undefined ? update.scaleX : sprite.scale.x,
                    update.scaleY !== undefined ? update.scaleY : sprite.scale.y
                );
            }
            
            if (update.rotation !== undefined) sprite.rotation = update.rotation;
            if (update.alpha !== undefined) sprite.alpha = update.alpha;
            if (update.visible !== undefined) sprite.visible = update.visible;
            if (update.tint !== undefined) sprite.tint = update.tint;
            
            this.pendingUpdates.delete(sprite);
        }
        
        this.spriteUpdates.splice(0, batchSize);
    }

    private processContainerUpdates(): void {
        const batchSize = Math.min(this.containerUpdates.length, this.MAX_BATCH_SIZE);
        
        for (let i = 0; i < batchSize; i++) {
            const update = this.containerUpdates[i];
            const container = update.container;
            
            if (update.x !== undefined || update.y !== undefined) {
                container.position.set(
                    update.x !== undefined ? update.x : container.x,
                    update.y !== undefined ? update.y : container.y
                );
            }
            
            if (update.scaleX !== undefined || update.scaleY !== undefined) {
                container.scale.set(
                    update.scaleX !== undefined ? update.scaleX : container.scale.x,
                    update.scaleY !== undefined ? update.scaleY : container.scale.y
                );
            }
            
            if (update.rotation !== undefined) container.rotation = update.rotation;
            if (update.alpha !== undefined) container.alpha = update.alpha;
            if (update.visible !== undefined) container.visible = update.visible;
            
            this.pendingUpdates.delete(container);
        }
        
        this.containerUpdates.splice(0, batchSize);
    }

    private clearProcessedUpdates(): void {
        
    }

    public immediatePositionUpdate(obj: PIXI.DisplayObject, x: number, y: number): void {
        obj.position.set(x, y);
    }

    public immediateVisibilityUpdate(obj: PIXI.DisplayObject, visible: boolean): void {
        obj.visible = visible;
    }

    public queueBulkPositionUpdates(updates: { obj: PIXI.DisplayObject; x: number; y: number }[]): void {
        for (const update of updates) {
            this.queuePositionUpdate(update.obj, update.x, update.y);
        }
    }

    public queueBulkVisibilityUpdates(updates: { obj: PIXI.DisplayObject; visible: boolean }[]): void {
        for (const update of updates) {
            this.queueVisibilityUpdate(update.obj, update.visible);
        }
    }

    public getStats(): {
        pendingSpriteUpdates: number;
        pendingContainerUpdates: number;
        pendingPositionUpdates: number;
        pendingScaleUpdates: number;
        pendingVisibilityUpdates: number;
        averageProcessingTime: number;
    } {
        return {
            pendingSpriteUpdates: this.spriteUpdates.length,
            pendingContainerUpdates: this.containerUpdates.length,
            pendingPositionUpdates: this.positionBuffer.length,
            pendingScaleUpdates: this.scaleBuffer.length,
            pendingVisibilityUpdates: this.visibilityBuffer.length,
            averageProcessingTime: this.UPDATE_INTERVAL
        };
    }

    public clearAll(): void {
        this.spriteUpdates.length = 0;
        this.containerUpdates.length = 0;
        this.positionBuffer.length = 0;
        this.scaleBuffer.length = 0;
        this.visibilityBuffer.length = 0;
        this.pendingUpdates.clear();
    }

    public processPriorityUpdates(): void {
        this.processPositionUpdates();
        this.processVisibilityUpdates();
    }
}