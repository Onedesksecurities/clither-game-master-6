export interface Vector2 {
    x: number;
    y: number;
}

export interface SnakeSegment extends Vector2 {
    angle: number;
    snakeId?: string;
}

export interface Food extends Vector2 {
    id: number;
    value: number;
    radius: number;
    isDeathFood?: boolean; 
    color?: number;        
}