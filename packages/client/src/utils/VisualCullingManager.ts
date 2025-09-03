
import * as PIXI from 'pixi.js';

interface CullableObject {
    displayObject: PIXI.DisplayObject;
    x: number;
    y: number;
    radius: number;
    priority: 'high' | 'medium' | 'low';
    lodLevel?: number;
    lastVisible?: boolean;
}

export class VisualCullingManager {
    private cullableObjects: Map<string, CullableObject> = new Map();
    private viewBounds: PIXI.Rectangle = new PIXI.Rectangle();
    private lastUpdateTime: number = 0;
    private readonly UPDATE_INTERVAL = 33; 
    
    private readonly LOD_DISTANCES = {
        HIGH: 500,    
        MEDIUM: 1200, 
        LOW: 2000     
    };
    
    private readonly CULLING_MARGIN = 100;
    
    private culledCount: number = 0;
    private totalObjects: number = 0;

    public registerObject(
        id: string,
        displayObject: PIXI.DisplayObject,
        x: number,
        y: number,
        radius: number,
        priority: 'high' | 'medium' | 'low' = 'medium'
    ): void {
        this.cullableObjects.set(id, {
            displayObject,
            x,
            y,
            radius,
            priority,
            lodLevel: 0,
            lastVisible: displayObject.visible
        });
    }

    public updateObjectPosition(id: string, x: number, y: number): void {
        const obj = this.cullableObjects.get(id);
        if (obj) {
            obj.x = x;
            obj.y = y;
        }
    }

    public unregisterObject(id: string): void {
        this.cullableObjects.delete(id);
    }

    public updateViewBounds(viewBounds: PIXI.Rectangle): void {
        this.viewBounds.copyFrom(viewBounds);
    }

    public update(currentTime: number, forceUpdate: boolean = false): void {
        if (!forceUpdate && currentTime - this.lastUpdateTime < this.UPDATE_INTERVAL) {
            return;
        }

        this.lastUpdateTime = currentTime;
        this.performCulling();
        this.updateLOD();
    }

    private performCulling(): void {
        this.culledCount = 0;
        this.totalObjects = this.cullableObjects.size;

        const expandedBounds = new PIXI.Rectangle(
            this.viewBounds.x - this.CULLING_MARGIN,
            this.viewBounds.y - this.CULLING_MARGIN,
            this.viewBounds.width + this.CULLING_MARGIN * 2,
            this.viewBounds.height + this.CULLING_MARGIN * 2
        );

        for (const [_, obj] of this.cullableObjects.entries()) {
            const shouldBeVisible = this.isInBounds(obj, expandedBounds);
            
            if (shouldBeVisible !== obj.lastVisible) {
                obj.displayObject.visible = shouldBeVisible;
                obj.lastVisible = shouldBeVisible;
                
                if (!shouldBeVisible) {
                    this.culledCount++;
                }
            }
        }
    }

    private updateLOD(): void {
        const centerX = this.viewBounds.x + this.viewBounds.width * 0.5;
        const centerY = this.viewBounds.y + this.viewBounds.height * 0.5;

        for (const [_, obj] of this.cullableObjects.entries()) {
            if (!obj.displayObject.visible) continue;

            const distance = Math.hypot(obj.x - centerX, obj.y - centerY);
            let newLodLevel = 0;

            if (distance > this.LOD_DISTANCES.LOW) {
                newLodLevel = 2; 
            } else if (distance > this.LOD_DISTANCES.MEDIUM) {
                newLodLevel = 1; 
            } else {
                newLodLevel = 0; 
            }

            if (obj.lodLevel !== newLodLevel) {
                obj.lodLevel = newLodLevel;
                this.applyLOD(obj, newLodLevel);
            }
        }
    }

    private applyLOD(obj: CullableObject, lodLevel: number): void {
        const displayObj = obj.displayObject;

        switch (lodLevel) {
            case 0: 
                displayObj.alpha = 1.0;
                if (displayObj instanceof PIXI.Container) {
                    
                    displayObj.children.forEach(child => {
                        if (child.name !== 'lod-hidden') {
                            child.visible = true;
                        }
                    });
                }
                break;

            case 1: 
                displayObj.alpha = 0.9;
                if (displayObj instanceof PIXI.Container) {
                    
                    displayObj.children.forEach(child => {
                        if (child.name === 'glow' || child.name === 'effect') {
                            child.visible = false;
                        }
                    });
                }
                break;

            case 2: 
                displayObj.alpha = 0.7;
                if (displayObj instanceof PIXI.Container) {
                    
                    displayObj.children.forEach((child, index) => {
                        if (index > 0) { 
                            child.visible = false;
                        }
                    });
                }
                break;
        }
    }

    private isInBounds(obj: CullableObject, bounds: PIXI.Rectangle): boolean {
        
        const objLeft = obj.x - obj.radius;
        const objRight = obj.x + obj.radius;
        const objTop = obj.y - obj.radius;
        const objBottom = obj.y + obj.radius;

        return !(objRight < bounds.x || 
                 objLeft > bounds.x + bounds.width || 
                 objBottom < bounds.y || 
                 objTop > bounds.y + bounds.height);
    }

    public performPriorityCulling(): void {
        const highPriorityBounds = new PIXI.Rectangle(
            this.viewBounds.x - this.CULLING_MARGIN * 0.5,
            this.viewBounds.y - this.CULLING_MARGIN * 0.5,
            this.viewBounds.width + this.CULLING_MARGIN,
            this.viewBounds.height + this.CULLING_MARGIN
        );

        for (const [_, obj] of this.cullableObjects.entries()) {
            let shouldBeVisible = false;

            switch (obj.priority) {
                case 'high':
                    
                    shouldBeVisible = this.isInBounds(obj, this.viewBounds);
                    break;
                case 'medium':
                    
                    shouldBeVisible = this.isInBounds(obj, highPriorityBounds);
                    break;
                case 'low':
                    
                    const tightBounds = new PIXI.Rectangle(
                        this.viewBounds.x + this.CULLING_MARGIN * 0.25,
                        this.viewBounds.y + this.CULLING_MARGIN * 0.25,
                        this.viewBounds.width - this.CULLING_MARGIN * 0.5,
                        this.viewBounds.height - this.CULLING_MARGIN * 0.5
                    );
                    shouldBeVisible = this.isInBounds(obj, tightBounds);
                    break;
            }

            if (shouldBeVisible !== obj.lastVisible) {
                obj.displayObject.visible = shouldBeVisible;
                obj.lastVisible = shouldBeVisible;
            }
        }
    }

    public setObjectTypeVisibility(filter: (obj: CullableObject) => boolean, visible: boolean): void {
        for (const [_, obj] of this.cullableObjects.entries()) {
            if (filter(obj)) {
                obj.displayObject.visible = visible;
                obj.lastVisible = visible;
            }
        }
    }

    public enablePerformanceMode(): void {
        for (const [_, obj] of this.cullableObjects.entries()) {
            if (obj.priority === 'low') {
                obj.displayObject.visible = false;
                obj.lastVisible = false;
            }
        }
    }

    public disablePerformanceMode(): void {
        
        this.lastUpdateTime = 0;
    }

    public getObjectsInArea(bounds: PIXI.Rectangle): CullableObject[] {
        const result: CullableObject[] = [];
        
        for (const obj of this.cullableObjects.values()) {
            if (this.isInBounds(obj, bounds)) {
                result.push(obj);
            }
        }
        
        return result;
    }

    public getStats(): {
        totalObjects: number;
        visibleObjects: number;
        culledObjects: number;
        cullingRatio: number;
        lodBreakdown: { high: number; medium: number; low: number };
    } {
        let visibleCount = 0;
        const lodBreakdown = { high: 0, medium: 0, low: 0 };

        for (const obj of this.cullableObjects.values()) {
            if (obj.displayObject.visible) {
                visibleCount++;
                
                switch (obj.lodLevel) {
                    case 0: lodBreakdown.high++; break;
                    case 1: lodBreakdown.medium++; break;
                    case 2: lodBreakdown.low++; break;
                }
            }
        }

        return {
            totalObjects: this.totalObjects,
            visibleObjects: visibleCount,
            culledObjects: this.totalObjects - visibleCount,
            cullingRatio: this.totalObjects > 0 ? (this.totalObjects - visibleCount) / this.totalObjects : 0,
            lodBreakdown
        };
    }

    public clear(): void {
        this.cullableObjects.clear();
        this.culledCount = 0;
        this.totalObjects = 0;
    }

    public registerObjects(objects: Array<{
        id: string;
        displayObject: PIXI.DisplayObject;
        x: number;
        y: number;
        radius: number;
        priority?: 'high' | 'medium' | 'low';
    }>): void {
        for (const objData of objects) {
            this.registerObject(
                objData.id,
                objData.displayObject,
                objData.x,
                objData.y,
                objData.radius,
                objData.priority || 'medium'
            );
        }
    }

    public batchUpdatePositions(updates: Array<{ id: string; x: number; y: number }>): void {
        for (const update of updates) {
            this.updateObjectPosition(update.id, update.x, update.y);
        }
    }
}