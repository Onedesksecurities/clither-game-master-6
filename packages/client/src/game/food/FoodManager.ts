import * as PIXI from 'pixi.js';
import { Food } from './Food';
import { SnakeV2 as Snake } from '../snake/SnakeV2';
import { Quadtree, Rectangle } from '@timohausmann/quadtree-ts';

import { config } from 'shared';
import { FoodSpawner } from './FoodSpawner';
import { FoodPhysics } from './FoodPhysics';
import { FoodType } from 'shared';
import { GraphicsUtils } from '../../utils/Graphics';

const { WORLD_RADIUS } = config;

interface FoodData {
    foodRef: Food;
}

export class FoodManager {
    private container: PIXI.Container;
    private spawner: FoodSpawner;
    private physics: FoodPhysics;
    private foods: Map<number, Food> = new Map();
    private foodTree: Quadtree<Rectangle<FoodData>>;
    private foodToQuadtreeRect: Map<Food, Rectangle<FoodData>> = new Map();
    private homingFoods: Set<Food> = new Set();

    constructor() {
        this.container = new PIXI.Container();
        this.spawner = new FoodSpawner();
        this.physics = new FoodPhysics();

        this.foodTree = new Quadtree({
            width: WORLD_RADIUS * 2,
            height: WORLD_RADIUS * 2,
            x: -WORLD_RADIUS,
            y: -WORLD_RADIUS
        });
    }

    public getContainer(): PIXI.Container {
        return this.container;
    }

    public initializeFromServer(serverFoods: FoodType[]): void {
        for (const serverFood of serverFoods) {
            this.spawnNewFood(serverFood);
        }
    }

    public spawnNewFood(serverFood: FoodType): Food | undefined {
        if (this.foods.has(serverFood.id)) {
            return;
        }
        let foodTexture: PIXI.Texture | undefined = undefined;
        this.clearClosePredictedFood(serverFood.x, serverFood.y);
        if (serverFood.isDeathFood && typeof serverFood.color !== 'undefined') {
            foodTexture = GraphicsUtils.createDeathFoodTexture(serverFood.color);
        }
        const food = this.spawner.spawnFood({ x: serverFood.x, y: serverFood.y }, serverFood.value, foodTexture, serverFood.isDeathFood ? true : false);
        food.id = serverFood.id;
        this.addFoodToWorld(food);
        return food;
    }

    private clearClosePredictedFood(x: number, y: number): void {
        const removalRadius = 20;
        for (const food of this.foods.values()) {
            if (food.isPredicted) {
                const dx = food.x - x;
                const dy = food.y - y;
                if (dx * dx + dy * dy < removalRadius * removalRadius) {
                    this.removeFood(food.id);
                }
            }
        }
    }

    private addFoodToWorld(food: Food): void {
        this.foods.set(food.id, food);
        this.container.addChild(food.sprite);

        const quadtreeRect = new Rectangle<FoodData>({
            x: food.x - food.radius, y: food.y - food.radius, width: food.radius * 2, height: food.radius * 2,
            data: { foodRef: food },
        });

        this.foodToQuadtreeRect.set(food, quadtreeRect);
    }

    public update(snakes: Map<string, Snake>, view: PIXI.Rectangle, deltaTime: number): void {

        this.foodTree.clear();
        for (const food of this.foods.values()) {
            const rect = this.foodToQuadtreeRect.get(food);
            if (rect) {
                rect.x = food.x - food.radius;
                rect.y = food.y - food.radius;
                this.foodTree.insert(rect);
            }
        }

        this.physics.update(snakes, this.foodTree, this.homingFoods, deltaTime, (consumedFood) => {
            this.removeFood(consumedFood.id);
        });

        this.updateVisibility(view);

        this.updateWiggleAnimation(deltaTime);
    }

    private updateVisibility(view: PIXI.Rectangle): void {
        const searchAreaForView = new Rectangle({ x: view.x, y: view.y, width: view.width, height: view.height });
        const visibleFoodRects = this.foodTree.retrieve(searchAreaForView) as Rectangle<FoodData>[];
        const currentlyVisibleFood: Set<Food> = new Set();

        for (const rect of visibleFoodRects) {
            if (rect.data?.foodRef) {
                currentlyVisibleFood.add(rect.data.foodRef);
            }
        }

        for (const food of this.foods.values()) {
            food.sprite.visible = currentlyVisibleFood.has(food) || food.isBeingAttracted;
        }
    }

    private updateWiggleAnimation(deltaTime: number): void {

        for (const food of this.foods.values()) {
            if (food.sprite.visible) {
                food.updateWiggle(deltaTime);
            }
        }
    }

    public removeFoods(foodIds: number[]): void {
        for (const foodId of foodIds) {
            this.removeFood(foodId);
        }
    }

    private removeFood(foodId: number): void {
        const foodToRemove = this.foods.get(foodId);
        if (foodToRemove) {
            this.foods.delete(foodId);
            this.foodToQuadtreeRect.delete(foodToRemove);
            this.homingFoods.delete(foodToRemove);
            this.container.removeChild(foodToRemove.sprite);
            foodToRemove.destroy();
        }
    }

    public spawnDeathFoods(serverFoods: FoodType[]): void {
        let delay = 0;
        const delayIncrement = 1;

        for (const serverFood of serverFoods) {
            setTimeout(() => {
                const food = this.spawnNewFood(serverFood);
                if (food) {
                    food.fadeIn();
                }
            }, delay);
            delay += delayIncrement;
        }
    }
}
