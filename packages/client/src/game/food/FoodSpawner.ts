import * as PIXI from 'pixi.js';
import { Food } from './Food';
import { GraphicsUtils } from '../../utils/Graphics';

import { config } from 'shared';

const { food: foodConfig, WORLD_RADIUS } = config;

export class FoodSpawner {
    private foodTextures: PIXI.Texture[] = [];

    constructor() {

        this.initializeFoodTextures();
    }

    private initializeFoodTextures(): void {
        for (const color of config.food.COLORS) {
            const texture = GraphicsUtils.createColoredFoodTexture(color);
            this.foodTextures.push(texture);
        }
    }

    public spawnFood(position?: { x: number; y: number }, value?: number, texture?: PIXI.Texture, isDeathFood?: boolean): Food {
        let foodValue: number;

        if (value !== undefined) {
            foodValue = value;
        } else {
            const random = Math.random();
            if (random < 0.5) {
                foodValue = 0.2 + Math.random() * 0.25;
            } else if (random < 0.7) {
                foodValue = 0.45 + Math.random() * 0.25;
            } else if (random < 0.94) {
                foodValue = 0.75 + Math.random() * 0.7;
            } else if (random < 0.98) {
                foodValue = 1.2 + Math.random() * 0.8;
            } else {
                foodValue = 2.0 + Math.random() * 1.0;
            }
        }

        const deathFoodRadius =  foodConfig.DEATH_FOOD_RADIUS * Math.max(0.65, Math.random())
        const foodRadius = isDeathFood ? deathFoodRadius : foodConfig.BASE_RADIUS + (foodValue / 2.0) * 5;
        const optimizedFoodRadius = isDeathFood ? foodRadius : Math.min(foodRadius, foodConfig.MAX_FOOD_RADIUS);

        const x = position ? position.x : (Math.random() - 0.5) * WORLD_RADIUS * 2;
        const y = position ? position.y : (Math.random() - 0.5) * WORLD_RADIUS * 2;

        let foodTextureToUse: PIXI.Texture;
        if (texture) {
            foodTextureToUse = texture;
        } else {

            const randomIndex = Math.floor(Math.random() * this.foodTextures.length);
            foodTextureToUse = this.foodTextures[randomIndex];
        }

        const food = new Food(x, y, optimizedFoodRadius, foodValue, foodTextureToUse, isDeathFood);

        const coreScale = optimizedFoodRadius / 16;
        food.sprite.scale.set(coreScale);
        food.sprite.alpha = 0.8;
        food.originalScale = coreScale;
        food.sprite.blendMode = PIXI.BLEND_MODES.ADD;

        food.sprite.visible = true;

        return food;
    }
}