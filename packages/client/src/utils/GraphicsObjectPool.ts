
import * as PIXI from 'pixi.js';

interface PooledSprite extends PIXI.Sprite {
    inUse: boolean;
    poolId: string;
}

interface PooledContainer extends PIXI.Container {
    inUse: boolean;
    poolId: string;
}

interface PooledGraphics extends PIXI.Graphics {
    inUse: boolean;
    poolId: string;
}

export class GraphicsObjectPool {
    private spritePool: Map<string, PooledSprite[]> = new Map();
    private containerPool: PooledContainer[] = [];
    private graphicsPool: PooledGraphics[] = [];
    
    private activeSpritesByTexture: Map<string, Set<PooledSprite>> = new Map();
    private activeContainers: Set<PooledContainer> = new Set();
    private activeGraphics: Set<PooledGraphics> = new Set();
    
    private readonly MAX_POOL_SIZE = 2000;
    private readonly TEXTURE_POOL_SIZE = 200;

    public acquireSprite(texture: PIXI.Texture, textureKey: string = 'default'): PIXI.Sprite {
        let pool = this.spritePool.get(textureKey);
        
        if (!pool) {
            pool = [];
            this.spritePool.set(textureKey, pool);
            this.activeSpritesByTexture.set(textureKey, new Set());
        }

        let sprite: PooledSprite;
        
        if (pool.length > 0) {
            sprite = pool.pop()!;
        } else {
            sprite = new PIXI.Sprite(texture) as PooledSprite;
            sprite.poolId = textureKey;
        }

        this.resetSprite(sprite, texture);
        sprite.inUse = true;
        
        this.activeSpritesByTexture.get(textureKey)!.add(sprite);
        return sprite;
    }

    public releaseSprite(sprite: PIXI.Sprite): void {
        const pooledSprite = sprite as PooledSprite;
        if (!pooledSprite.inUse) return;

        pooledSprite.inUse = false;
        
        const activeSet = this.activeSpritesByTexture.get(pooledSprite.poolId);
        if (activeSet) {
            activeSet.delete(pooledSprite);
        }

        if (sprite.parent) {
            sprite.parent.removeChild(sprite);
        }

        const pool = this.spritePool.get(pooledSprite.poolId);
        if (pool && pool.length < this.TEXTURE_POOL_SIZE) {
            pool.push(pooledSprite);
        } else {
            
            sprite.destroy();
        }
    }

    public acquireContainer(): PIXI.Container {
        let container: PooledContainer;
        
        if (this.containerPool.length > 0) {
            container = this.containerPool.pop()!;
        } else {
            container = new PIXI.Container() as PooledContainer;
            container.poolId = 'container';
        }

        this.resetContainer(container);
        container.inUse = true;
        
        this.activeContainers.add(container);
        return container;
    }

    public releaseContainer(container: PIXI.Container): void {
        const pooledContainer = container as PooledContainer;
        if (!pooledContainer.inUse) return;

        pooledContainer.inUse = false;
        
        if (container.parent) {
            container.parent.removeChild(container);
        }

        while (container.children.length > 0) {
            const child = container.children[0];
            if ((child as any).inUse !== undefined) {
                
                if (child instanceof PIXI.Sprite) {
                    this.releaseSprite(child);
                } else if (child instanceof PIXI.Container) {
                    this.releaseContainer(child);
                } else if (child instanceof PIXI.Graphics) {
                    this.releaseGraphics(child);
                }
            } else {
                container.removeChild(child);
            }
        }

        this.activeContainers.delete(pooledContainer);

        if (this.containerPool.length < this.MAX_POOL_SIZE) {
            this.containerPool.push(pooledContainer);
        } else {
            container.destroy({ children: true });
        }
    }

    public acquireGraphics(): PIXI.Graphics {
        let graphics: PooledGraphics;
        
        if (this.graphicsPool.length > 0) {
            graphics = this.graphicsPool.pop()!;
        } else {
            graphics = new PIXI.Graphics() as PooledGraphics;
            graphics.poolId = 'graphics';
        }

        this.resetGraphics(graphics);
        graphics.inUse = true;
        
        this.activeGraphics.add(graphics);
        return graphics;
    }

    public releaseGraphics(graphics: PIXI.Graphics): void {
        const pooledGraphics = graphics as PooledGraphics;
        if (!pooledGraphics.inUse) return;

        pooledGraphics.inUse = false;
        
        if (graphics.parent) {
            graphics.parent.removeChild(graphics);
        }

        this.activeGraphics.delete(pooledGraphics);

        graphics.clear();

        if (this.graphicsPool.length < this.MAX_POOL_SIZE) {
            this.graphicsPool.push(pooledGraphics);
        } else {
            graphics.destroy();
        }
    }

    public releaseSpritesByTexture(textureKey: string): void {
        const activeSet = this.activeSpritesByTexture.get(textureKey);
        if (!activeSet) return;

        const spritesToRelease = Array.from(activeSet);
        for (const sprite of spritesToRelease) {
            this.releaseSprite(sprite);
        }
    }

    public releaseAllContainers(): void {
        const containersToRelease = Array.from(this.activeContainers);
        for (const container of containersToRelease) {
            this.releaseContainer(container);
        }
    }

    public releaseAllGraphics(): void {
        const graphicsToRelease = Array.from(this.activeGraphics);
        for (const graphics of graphicsToRelease) {
            this.releaseGraphics(graphics);
        }
    }

    private resetSprite(sprite: PooledSprite, texture: PIXI.Texture): void {
        sprite.texture = texture;
        sprite.position.set(0, 0);
        sprite.scale.set(1, 1);
        sprite.rotation = 0;
        sprite.anchor.set(0.5, 0.5);
        sprite.alpha = 1;
        sprite.visible = true;
        sprite.tint = 0xffffff;
        sprite.blendMode = PIXI.BLEND_MODES.NORMAL;
        sprite.zIndex = 0;
    }

    private resetContainer(container: PooledContainer): void {
        container.position.set(0, 0);
        container.scale.set(1, 1);
        container.rotation = 0;
        container.alpha = 1;
        container.visible = true;
        container.zIndex = 0;
        
    }

    private resetGraphics(graphics: PooledGraphics): void {
        graphics.clear();
        graphics.position.set(0, 0);
        graphics.scale.set(1, 1);
        graphics.rotation = 0;
        graphics.alpha = 1;
        graphics.visible = true;
        graphics.zIndex = 0;
    }

    public getPoolStats(): {
        spritesByTexture: { [key: string]: { pooled: number; active: number } };
        containers: { pooled: number; active: number };
        graphics: { pooled: number; active: number };
        totalMemoryUsage: number;
    } {
        const spritesByTexture: { [key: string]: { pooled: number; active: number } } = {};
        
        for (const [textureKey, pool] of this.spritePool.entries()) {
            const activeSet = this.activeSpritesByTexture.get(textureKey);
            spritesByTexture[textureKey] = {
                pooled: pool.length,
                active: activeSet ? activeSet.size : 0
            };
        }

        return {
            spritesByTexture,
            containers: {
                pooled: this.containerPool.length,
                active: this.activeContainers.size
            },
            graphics: {
                pooled: this.graphicsPool.length,
                active: this.activeGraphics.size
            },
            totalMemoryUsage: this.estimateMemoryUsage()
        };
    }

    private estimateMemoryUsage(): number {
        let usage = 0;
        
        for (const pool of this.spritePool.values()) {
            usage += pool.length * 200; 
        }
        for (const activeSet of this.activeSpritesByTexture.values()) {
            usage += activeSet.size * 200;
        }
        
        usage += (this.containerPool.length + this.activeContainers.size) * 150;
        
        usage += (this.graphicsPool.length + this.activeGraphics.size) * 300;
        
        return usage;
    }

    public destroy(): void {
        
        for (const activeSet of this.activeSpritesByTexture.values()) {
            for (const sprite of activeSet) {
                sprite.destroy();
            }
        }
        
        for (const container of this.activeContainers) {
            container.destroy({ children: true });
        }
        
        for (const graphics of this.activeGraphics) {
            graphics.destroy();
        }
        
        for (const pool of this.spritePool.values()) {
            for (const sprite of pool) {
                sprite.destroy();
            }
        }
        
        for (const container of this.containerPool) {
            container.destroy({ children: true });
        }
        
        for (const graphics of this.graphicsPool) {
            graphics.destroy();
        }
        
        this.spritePool.clear();
        this.containerPool.length = 0;
        this.graphicsPool.length = 0;
        this.activeSpritesByTexture.clear();
        this.activeContainers.clear();
        this.activeGraphics.clear();
    }
}