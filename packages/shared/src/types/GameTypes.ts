
import { Vector2 } from "../utils/Vector2";

export interface SnakeSegment {
    x: number;
    y: number;
    angle: number;
    snakeId?: string;
}

export interface FoodType extends Vector2 {
    id: number;
    value: number;
    radius: number;
    isDeathFood?: boolean;
    color?: number;
}