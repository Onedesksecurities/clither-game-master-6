import { Quadtree, Rectangle } from '@timohausmann/quadtree-ts';
import { Food } from './Food';
import { SnakeV2 as Snake } from '../snake/SnakeV2';

import { config } from 'shared';

const { food: foodConfig } = config;
const { ATTRACTION_RADIUS_BASE, ATTRACTION_RADIUS_GROWTH_FACTOR, ATTRACTION_SPEED, FINAL_SCALE_PERCENT, ATTRACTION_WIDE_CONE_ANGLE } = foodConfig;

interface FoodData {
    foodRef: Food;
}

export class FoodPhysics {

    public update(snakes: Map<string, Snake>, foodTree: Quadtree<Rectangle<FoodData>>, homingFoods: Set<Food>, deltaTime: number, onConsume: (food: Food) => void): void {
        this.updateHomingFoods(homingFoods, deltaTime, onConsume);
        this.findNewHomingFoods(snakes, foodTree, homingFoods);
    }

    private updateHomingFoods(homingFoods: Set<Food>, deltaTime: number, onConsume: (food: Food) => void): void {
        for (const food of homingFoods) {
            const targetSnake = food.attractionTarget;
            if (!targetSnake) {
                this.stopHoming(food, homingFoods);
                continue;
            }

            const headPos = targetSnake.getHeadPosition();
            const headRadius = targetSnake.getCurrentRadius();
            const isBoosting = targetSnake.isBoosting;
            const currentAttractionSpeed = isBoosting ? ATTRACTION_SPEED * 2 : ATTRACTION_SPEED;

            const dx = headPos.x - food.sprite.x;
            const dy = headPos.y - food.sprite.y;
            const dist = Math.hypot(dx, dy);

            if (dist < headRadius) {
                onConsume(food);
                continue;
            }

            const speedPerFrame = currentAttractionSpeed * (deltaTime / 60);
            food.sprite.x += (dx / dist) * speedPerFrame;
            food.sprite.y += (dy / dist) * speedPerFrame;


            food.x = food.sprite.x;
            food.y = food.sprite.y;

            const travelProgress = Math.max(0, 1 - (dist / food.attractionStartDistance));
            const scaleMultiplier = 1 - (1 - FINAL_SCALE_PERCENT) * travelProgress;
            const newScale = food.originalScale * scaleMultiplier;
            food.sprite.scale.set(newScale);
        }
    }

    private findNewHomingFoods(snakes: Map<string, Snake>, foodTree: Quadtree<Rectangle<FoodData>>, homingFoods: Set<Food>): void {
        for (const snake of snakes.values()) {
            const headPos = snake.getHeadPosition();
            const headRadius = snake.getCurrentRadius();
            const attractionRadius = ATTRACTION_RADIUS_BASE + headRadius * ATTRACTION_RADIUS_GROWTH_FACTOR;

            const searchArea = new Rectangle({
                x: headPos.x - attractionRadius,
                y: headPos.y - attractionRadius,
                width: attractionRadius * 2,
                height: attractionRadius * 2,
            });
            const candidates = foodTree.retrieve(searchArea) as Rectangle<FoodData>[];

            for (const rect of candidates) {
                if (rect.data) {
                    const food = rect.data.foodRef;
                    if (!food || food.isBeingAttracted) continue;

                    const dx = food.sprite.x - headPos.x;
                    const dy = food.sprite.y - headPos.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist > attractionRadius) continue;

                    if (dist <= headRadius + food.radius) {
                        this.startHoming(food, dist, homingFoods, snake);
                        continue;
                    }

                    const angleToFood = Math.atan2(dy, dx);
                    const angleDiff = this.getShortestAngle(snake.currentAngle, angleToFood);

                    if (Math.abs(angleDiff) < ATTRACTION_WIDE_CONE_ANGLE / 2) {
                        this.startHoming(food, dist, homingFoods, snake);
                    }
                }
            }
        }
    }

    private startHoming(food: Food, distance: number, homingFoods: Set<Food>, targetSnake: Snake): void {
        if (targetSnake.isSpectator) return;
        food.isBeingAttracted = true;
        food.attractionStartDistance = distance;
        food.attractionTarget = targetSnake;
        homingFoods.add(food);
    }

    private stopHoming(food: Food, homingFoods: Set<Food>): void {
        food.isBeingAttracted = false;
        food.attractionTarget = null;
        homingFoods.delete(food);
    }

    private getShortestAngle(from: number, to: number): number {
        const twoPi = 2 * Math.PI;
        const difference = (to - from) % twoPi;
        return difference > Math.PI ? difference - twoPi : difference < -Math.PI ? difference + twoPi : difference;
    }
}