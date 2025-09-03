import { config } from 'shared';
import { Food, Vector2 } from 'shared';
import { Quadtree } from 'shared';
import { Snake } from './Snake';

export class FoodManager {
    public foods: Map<number, Food> = new Map();
    public foodQuadtree: Quadtree;
    private nextFoodId: number = 0;

    public onFoodSpawned: (food: Food) => void = () => { };
    public onFoodRemoved: (foodId: number) => void = () => { };

    constructor() {
        const boundary = {
            x: 0, y: 0,
            width: config.WORLD_RADIUS,
            height: config.WORLD_RADIUS
        };
        this.foodQuadtree = new Quadtree(boundary, 10);
        this.spawnInitialFood();
    }

    private spawnInitialFood(): void {
        const foodCount = config.WORLD_RADIUS /3
        for (let i = 0; i < foodCount; i++) {
            this.spawnFood();
        }
    }

    private generateRandomPosition(): Vector2 {
        let x, y, distanceSquared;
        const maxRadius = config.WORLD_RADIUS - config.food.MAX_FOOD_RADIUS;
        const maxRadiusSquared = maxRadius * maxRadius;

        do {
            x = (Math.random() * 2 - 1) * maxRadius;
            y = (Math.random() * 2 - 1) * maxRadius;
            distanceSquared = x * x + y * y;
        } while (distanceSquared > maxRadiusSquared);

        return { x, y };
    }

    public spawnFood(position?: Vector2, value?: number, isDeathFood: boolean = false, color?: number, radiusOverride?: number): Food {
        let foodValue: number;

        if (value !== undefined) {
            foodValue = value;
        } else {
            const random = Math.random();
            if (random < 0.4) {
                foodValue = 0.2 + Math.random() * 0.25;
            } else if (random < 0.5) {
                foodValue = 0.45 + Math.random() * 0.25;
            } else if (random < 0.64) {
                foodValue = 0.75 + Math.random() * 0.7;
            } else if (random < 0.78) {
                foodValue = 1.2 + Math.random() * 0.8;
            } else {
                foodValue = 2.0 + Math.random() * 1.0;
            }
        }

        let finalRadius: number;
        if (radiusOverride !== undefined) {
            finalRadius = radiusOverride;
        } else {
            const calculatedRadius = config.food.BASE_RADIUS + (foodValue / 2.0) * 5;
            finalRadius = Math.min(calculatedRadius, config.food.MAX_FOOD_RADIUS);
        }

        let pos: Vector2;
        if (position) {
            pos = position;
        } else {
            pos = this.generateRandomPosition();
        }

        const food: Food = {
            id: this.nextFoodId++,
            x: pos.x,
            y: pos.y,
            value: foodValue,
            radius: finalRadius,
            isDeathFood,
            color,
        };

        this.foods.set(food.id, food);
        this.foodQuadtree.insert(food);
        this.onFoodSpawned(food);
        return food;
    }

    public removeFoodAndRespawn(foodId: number, consumingSnake?: Snake): void {
        const food = this.foods.get(foodId);
        if (food) {
            this.foods.delete(foodId);
            this.foodQuadtree.remove(food);
            this.onFoodRemoved(foodId);

            if (food.isDeathFood) {
                return;
            }

            let spawnPosition: Vector2;

            if (consumingSnake) {

                spawnPosition = this.findSafeSpawnPosition(consumingSnake);
            } else {
                spawnPosition = this.generateRandomPosition();
            }

            this.spawnFood(spawnPosition);
        }
    }

    public removeFood(foodId: number): void {
        const food = this.foods.get(foodId);
        if (food) {
            this.foods.delete(foodId);
            this.foodQuadtree.remove(food);
            this.onFoodRemoved(foodId);
        }
    }

    private findSafeSpawnPosition(consumingSnake: Snake): Vector2 {
        const snakeHead = consumingSnake.getHead();

        const EXCLUSION_RADIUS = 600;
        const attempts = 20;

        for (let i = 0; i < attempts; i++) {
            const candidatePosition = this.generateRandomPosition();

            const distance = Math.hypot(
                candidatePosition.x - snakeHead.x,
                candidatePosition.y - snakeHead.y
            );

            if (distance > EXCLUSION_RADIUS) {
                return candidatePosition;
            }
        }

        return this.generateRandomPosition();
    }

    public findFarSpawnPositionFromAllSnakes(allSnakes: Snake[]): Vector2 {
        let bestPosition: Vector2 = { x: 0, y: 0 };
        let maxMinDistance = 0;
        const attempts = 100;

        for (let i = 0; i < attempts; i++) {
            const candidatePosition = this.generateRandomPosition();

            let minDistance = Infinity;
            for (const snake of allSnakes) {
                const snakeHead = snake.getHead();
                const distance = Math.hypot(
                    candidatePosition.x - snakeHead.x,
                    candidatePosition.y - snakeHead.y
                );
                minDistance = Math.min(minDistance, distance);
            }

            if (minDistance > maxMinDistance) {
                maxMinDistance = minDistance;
                bestPosition = candidatePosition;
            }
        }

        return bestPosition;
    }

    public spawnDeathFood(snake: Snake): Food[] {
        const deathFoods: Food[] = [];
        const particlesPerSegment = 1 / config.food.DEATH_FOOD_PER_SEGMENT;
        const totalParticles = snake.segments.length;
        const foodValue = ((snake.score / config.snake.SCORE_PER_LENGTH_UNIT) / totalParticles)*4;

        for (let i = 0; i < snake.segments.length; i+=4) {
            const segment = snake.segments[i];
            const angle = segment.angle;

            const spawnDistance = snake.radius * 0.1;
            const collisionPoint = {
                x: segment.x + spawnDistance * Math.cos(angle),
                y: segment.y + spawnDistance * Math.sin(angle)
            };

            const position = {
                x: collisionPoint.x + (Math.random() - 0.5) * snake.radius * 0.23,
                y: collisionPoint.y + (Math.random() - 0.5) * snake.radius * 0.23,
            };

            const food = this.spawnFood(
                position,
                foodValue * config.food.DEATH_FOOD_VALUE_FACTOR,
                true,
                snake.color,
                config.food.MAX_FOOD_RADIUS * 2
            );
            deathFoods.push(food);

        }
        return deathFoods;
    }
}