
import { CollisionObject } from './SpatialHashGrid';

class PooledCollisionObject implements CollisionObject {
    public x: number = 0;
    public y: number = 0;
    public radius: number = 0;
    public id: string = '';
    public type: 'head' | 'body' = 'body';
    public snakeId: string = '';
    public segmentIndex: number = 0;
    public angle?: number;
    public inUse: boolean = false;

    public reset(): void {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.id = '';
        this.type = 'body';
        this.snakeId = '';
        this.segmentIndex = 0;
        this.angle = undefined;
        this.inUse = false;
    }

    public configure(
        x: number,
        y: number,
        radius: number,
        id: string,
        type: 'head' | 'body',
        snakeId: string,
        segmentIndex: number,
        angle?: number
    ): void {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.id = id;
        this.type = type;
        this.snakeId = snakeId;
        this.segmentIndex = segmentIndex;
        this.angle = angle;
        this.inUse = true;
    }
}

export class CollisionObjectPool {
    private pool: PooledCollisionObject[] = [];
    private activeObjects: Set<PooledCollisionObject> = new Set();
    private poolSize: number;
    private maxPoolSize: number;

    constructor(initialSize: number = 1000, maxSize: number = 5000) {
        this.poolSize = initialSize;
        this.maxPoolSize = maxSize;

        for (let i = 0; i < initialSize; i++) {
            this.pool.push(new PooledCollisionObject());
        }
    }

    public acquire(
        x: number,
        y: number,
        radius: number,
        id: string,
        type: 'head' | 'body',
        snakeId: string,
        segmentIndex: number,
        angle?: number
    ): CollisionObject {
        let obj: PooledCollisionObject;

        if (this.pool.length > 0) {
            obj = this.pool.pop()!;
        } else if (this.activeObjects.size < this.maxPoolSize) {
            obj = new PooledCollisionObject();
        } else {
            
            const oldestObj = this.activeObjects.values().next().value;

            if (oldestObj) {
                this.activeObjects.delete(oldestObj);
                obj = oldestObj;
                obj.reset();
            } else {
                
                throw new Error("Pool recycling failed: max capacity reached, but no active objects were found to recycle.");
            }
        }

        obj.configure(x, y, radius, id, type, snakeId, segmentIndex, angle);
        this.activeObjects.add(obj);
        return obj;
    }

    public release(obj: CollisionObject): void {
        if (obj instanceof PooledCollisionObject) {
            if (this.activeObjects.has(obj)) {
                this.activeObjects.delete(obj);
                obj.reset();

                if (this.pool.length < this.poolSize) {
                    this.pool.push(obj);
                }
            }
        }
    }

    public releaseAll(): void {
        for (const obj of this.activeObjects) {
            obj.reset();
            if (this.pool.length < this.poolSize) {
                this.pool.push(obj);
            }
        }
        this.activeObjects.clear();
    }

    public getStats(): {
        poolSize: number;
        activeObjects: number;
        availableInPool: number;
        memoryEfficiency: number;
    } {
        return {
            poolSize: this.poolSize,
            activeObjects: this.activeObjects.size,
            availableInPool: this.pool.length,
            memoryEfficiency: this.pool.length / (this.pool.length + this.activeObjects.size)
        };
    }

    public acquireBatch(objects: Array<{
        x: number;
        y: number;
        radius: number;
        id: string;
        type: 'head' | 'body';
        snakeId: string;
        segmentIndex: number;
        angle?: number;
    }>): CollisionObject[] {
        const result: CollisionObject[] = [];

        for (const objData of objects) {
            result.push(this.acquire(
                objData.x,
                objData.y,
                objData.radius,
                objData.id,
                objData.type,
                objData.snakeId,
                objData.segmentIndex,
                objData.angle
            ));
        }

        return result;
    }
}