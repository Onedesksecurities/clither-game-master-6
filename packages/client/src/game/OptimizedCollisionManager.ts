import { SpatialHashGrid, CollisionObject } from '../utils/SpatialHashGrid';
import { CollisionObjectPool } from '../utils/CollisionObjectPool';
import { SnakeV2 as Snake } from './snake/SnakeV2';
import { SnakeSegment } from 'shared';
import { config } from 'shared';

interface CollisionResult {
    victimId: string;
    killerId: string;
    isHeadToHead: boolean;
}

export class OptimizedCollisionManager {
    private spatialGrid: SpatialHashGrid;
    private objectPool: CollisionObjectPool;
    private lastUpdateTime: number = 0;
    private readonly UPDATE_INTERVAL = 33;
    private readonly HEAD_CHECK_INTERVAL = 16;

    private currentFrameObjects: CollisionObject[] = [];

    constructor(worldRadius: number) {
        const cellSize = Math.max(100, worldRadius / 50);
        this.spatialGrid = new SpatialHashGrid(worldRadius * 2, worldRadius * 2, cellSize);
        this.objectPool = new CollisionObjectPool(2000, 8000);
    }

    public update(
        playerSnake: Snake,
        otherSnakes: Map<string, Snake>,
        currentTime: number
    ): CollisionResult[] {
        const collisionResults: CollisionResult[] = [];
        const shouldUpdateGrid = currentTime - this.lastUpdateTime > this.UPDATE_INTERVAL;
        const shouldCheckHeadCollisions = currentTime - this.lastUpdateTime > this.HEAD_CHECK_INTERVAL;

        if (shouldUpdateGrid) {
            this.rebuildSpatialGrid(playerSnake, otherSnakes);
            this.lastUpdateTime = currentTime;
        }

        if (shouldCheckHeadCollisions && playerSnake && !playerSnake.collided) {
            const playerCollisions = this.checkPlayerCollisions(playerSnake, otherSnakes);
            collisionResults.push(...playerCollisions);
        }

        return collisionResults;
    }

    private rebuildSpatialGrid(playerSnake: Snake, otherSnakes: Map<string, Snake>): void {
        this.spatialGrid.clear();
        this.objectPool.releaseAll();
        this.currentFrameObjects.length = 0;

        if (playerSnake && !playerSnake.collided && !playerSnake.isSpectator) {
            this.addSnakeToGrid(playerSnake, true);
        }

        for (const snake of otherSnakes.values()) {
            if (!snake.collided && !snake.isSpectator) {
                this.addSnakeToGrid(snake, false);
            }
        }
    }

    private addSnakeToGrid(snake: Snake, isPlayerSnake: boolean): void {
        const segments = snake.getSegments();
        const radius = snake.getCurrentRadius();
        const step = segments.length > 50 ? 3 : (segments.length > 20 ? 2 : 1);

        // Always add the head segment
        if (segments.length > 0) {
            const headSegment = segments[0];
            const headObj = this.objectPool.acquire(headSegment.x, headSegment.y, radius, `${snake.id}_0`, 'head', snake.id, 0, headSegment.angle);
            this.spatialGrid.insert(headObj);
            this.currentFrameObjects.push(headObj);
        }

        // Add body segments
        // For the player snake, we only care about its head for collisions it initiates.
        // For other snakes, we need their full bodies.
        if (!isPlayerSnake) {
            for (let i = 1; i < segments.length; i += step) {
                const segment = segments[i];
                const obj = this.objectPool.acquire(segment.x, segment.y, radius, `${snake.id}_${i}`, 'body', snake.id, i, segment.angle);
                this.spatialGrid.insert(obj);
                this.currentFrameObjects.push(obj);
            }
        }
    }

    private checkPlayerCollisions(playerSnake: Snake, otherSnakes: Map<string, Snake>): CollisionResult[] {
        const results: CollisionResult[] = [];
        const head = playerSnake.getCollisionHead();
        const headRadius = playerSnake.getCurrentRadius();

        const nearby = this.spatialGrid.queryRadius(head.x, head.y, headRadius * 3);

        for (const obj of nearby) {
            if (obj.snakeId === playerSnake.id) continue;

            if (this.tipCheck(head, headRadius, obj, obj.radius)) {
                if (obj.type === 'head') {
                    const otherSnake = otherSnakes.get(obj.snakeId);
                    if (otherSnake) {
                        const playerLength = playerSnake.getLength();
                        const otherLength = otherSnake.getLength();

                        if (playerLength < otherLength || (playerLength === otherLength && playerSnake.id < otherSnake.id)) {
                            results.push({ victimId: playerSnake.id, killerId: obj.snakeId, isHeadToHead: true });
                        } else {
                            results.push({ victimId: obj.snakeId, killerId: playerSnake.id, isHeadToHead: true });
                        }
                    }
                } else { // Body collision
                    results.push({ victimId: playerSnake.id, killerId: obj.snakeId, isHeadToHead: false });
                }
                break; // A collision was found, no need to check other nearby objects.
            }
        }

        return results;
    }

    private tipCheck(
        head: SnakeSegment,
        headRadius: number,
        target: CollisionObject,
        targetRadius: number
    ): boolean {
        const dx = head.x - target.x;
        const dy = head.y - target.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSum = headRadius + targetRadius;

        if (distanceSquared > radiusSum * radiusSum) {
            return false;
        }

        const projectionDistance = headRadius * config.snake.SNAKE_COLLISION_TIP_PROJECTION_FACTOR;
        const tipAngleRad = config.snake.SNAKE_COLLISION_TIP_ANGLE_DEGREES * (Math.PI / 180);

        const anglesToCheck = [0, tipAngleRad, -tipAngleRad];

        for (const angleOffset of anglesToCheck) {
            const checkAngle = head.angle + angleOffset;
            const tipX = head.x + Math.cos(checkAngle) * projectionDistance;
            const tipY = head.y + Math.sin(checkAngle) * projectionDistance;

            const tipDx = tipX - target.x;
            const tipDy = tipY - target.y;
            const tipDistanceSquared = tipDx * tipDx + tipDy * tipDy;

            if (tipDistanceSquared < targetRadius * targetRadius) {
                return true;
            }
        }
        return false;
    }

    public destroy(): void {
        this.spatialGrid.clear();
        this.objectPool.releaseAll();
        this.currentFrameObjects.length = 0;
    }
}