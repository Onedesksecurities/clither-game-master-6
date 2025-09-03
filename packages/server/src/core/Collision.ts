import { config as gameConfig } from 'shared'; // Import the new config
import { config } from 'shared';
import { Food, SnakeSegment, Vector2 } from 'shared';
import { Snake } from './Snake';
import { SpatialHash } from './SpatialHash';

export type SnakeCollisionResult = {
    collided: true;
    withSnake: Snake;
    reason: string;
    victimId: string;
    killerId: string;
} | {
    collided: false;
};

export type WallCollisionResult = {
    collided: true;
    reason: string;
    victimId: string;
} | {
    collided: false;
};

function tipCheckCirclesOverlap(
    head: SnakeSegment,
    headRadius: number,
    target: SnakeSegment,
    targetRadius: number
): boolean {
    const dx = head.x - target.x;
    const dy = head.y - target.y;
    const distanceSquared = dx * dx + dy * dy;
    const radiusSum = headRadius + targetRadius;

    // Broad-phase: If circles aren't even overlapping, no need for tip check.
    if (distanceSquared > radiusSum * radiusSum) {
        return false;
    }

    const projectionDistance = headRadius * gameConfig.snake.SNAKE_COLLISION_TIP_PROJECTION_FACTOR;
    const tipAngleRad = gameConfig.snake.SNAKE_COLLISION_TIP_ANGLE_DEGREES * (Math.PI / 180);

    // Check 3 points: center, left, and right
    const anglesToCheck = [0, tipAngleRad, -tipAngleRad];

    for (const angleOffset of anglesToCheck) {
        const checkAngle = head.angle + angleOffset;
        const tipX = head.x + Math.cos(checkAngle) * projectionDistance;
        const tipY = head.y + Math.sin(checkAngle) * projectionDistance;

        const tipDx = tipX - target.x;
        const tipDy = tipY - target.y;
        const tipDistanceSquared = tipDx * tipDx + tipDy * tipDy;

        // Check if the projected tip point is inside the target circle
        if (tipDistanceSquared < targetRadius * targetRadius) {
            return true;
        }
    }

    return false;
}

function simpleCirclesOverlap(c1: Vector2, r1: number, c2: Vector2, r2: number): boolean {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    return (dx * dx + dy * dy) < (r1 + r2) * (r1 + r2);
}

export class CollisionDetector {
    private spatialHash: SpatialHash;
    private aliveSnakes: Map<string, Snake> = new Map();

    constructor() {
        this.spatialHash = new SpatialHash(150);
    }

    public setAliveSnakes(snakes: Map<string, Snake>): void {
        this.aliveSnakes = snakes;
    }

    public updateSpatialHash(snakes: Map<string, Snake>): void {
        this.spatialHash.clear();

        for (const [snakeId, snake] of snakes.entries()) {
            for (let i = 0; i < snake.segments.length; i++) {
                this.spatialHash.insert(snake.segments[i], snakeId, i);
            }
        }
    }

    public checkWallCollision(snake: Snake): WallCollisionResult {

        if (snake.isSpectator) {
            return { collided: false };
        }
        if (!this.aliveSnakes.has(snake.id)) {
            return { collided: false };
        }

        const head = snake.getHead(); // Use actual head for wall checks
        const distFromCenter = Math.hypot(head.x, head.y);

        if (distFromCenter > config.WORLD_RADIUS + config.WALL_KILL_THRESHOLD) {
            return {
                collided: true,
                reason: `Hit wall boundary`,
                victimId: snake.id
            };
        }

        if (distFromCenter > config.WORLD_RADIUS - snake.radius) {
            const angleToCenter = Math.atan2(head.y, head.x);
            const angleFromSnakeToWall = angleToCenter;
            let angleDifference = Math.abs(snake.getCurrentAngle() - angleFromSnakeToWall);

            if (angleDifference > Math.PI) {
                angleDifference = 2 * Math.PI - angleDifference;
            }

            const collisionConeRadians = (config.WALL_COLLISION_ANGLE_DEGREES / 2) * (Math.PI / 180);

            if (angleDifference < collisionConeRadians) {
                return {
                    collided: true,
                    reason: `Hit wall at angle`,
                    victimId: snake.id
                };
            }
        }

        return { collided: false };
    }

    public checkSnakeCollision(snake: Snake): SnakeCollisionResult {
        if (snake.isSpectator) {
            return { collided: false };
        }
        if (!this.aliveSnakes.has(snake.id)) {
            return { collided: false };
        }

        const head = snake.getCollisionHead(); // This is now the actual head
        const queryRadius = snake.radius * 3;

        const nearbyItems = this.spatialHash.queryRadius(head.x, head.y, queryRadius);

        for (const item of nearbyItems) {
            const { segment, snakeId, segmentIndex } = item;

            if (snakeId === snake.id && segmentIndex < 4) {
                continue;
            }

            const otherSnake = this.aliveSnakes.get(snakeId);

            if (!otherSnake) continue;


            if(otherSnake.isSpectator) continue;

            if (tipCheckCirclesOverlap(head, snake.radius, segment, otherSnake.radius)) {
                const otherHead = otherSnake.getCollisionHead();

                if (segment.x === otherHead.x && segment.y === otherHead.y) { // Head-on collision
                    if (snake.id === otherSnake.id) continue;

                    if (snake.length < otherSnake.length) {
                        return {
                            collided: true, withSnake: otherSnake,
                            reason: `Head-on collision with larger snake: ${otherSnake.username}`,
                            victimId: snake.id, killerId: otherSnake.id
                        };
                    } else if (snake.length === otherSnake.length && snake.id < otherSnake.id) {
                        return {
                            collided: true, withSnake: otherSnake,
                            reason: `Head-on collision with ${otherSnake.username} (tie-break)`,
                            victimId: snake.id, killerId: otherSnake.id
                        };
                    }
                    continue;
                }

                if (snakeId !== snake.id) { // Body collision
                    return {
                        collided: true, withSnake: otherSnake,
                        reason: `Collision with body of ${otherSnake.username}`,
                        victimId: snake.id, killerId: otherSnake.id
                    };
                }
            }
        }

        return { collided: false };
    }

    public checkFoodCollision(snake: Snake, foods: Food[]): Food[] {
        if (snake.isSpectator) {
            return [];
        }
        if (!this.aliveSnakes.has(snake.id)) {
            return [];
        }

        const eatenFoods: Food[] = [];
        const head = snake.getCollisionHead();

        for (const food of foods) {
            if (simpleCirclesOverlap(head, snake.radius, food, food.radius)) {
                eatenFoods.push(food);
            }
        }

        return eatenFoods;
    }

    public getSpatialHash(): SpatialHash {
        return this.spatialHash;
    }
}