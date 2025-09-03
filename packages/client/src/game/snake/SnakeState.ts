import * as PIXI from 'pixi.js';
import { CircularBuffer } from 'shared';

import { config } from 'shared';

const { snake: snakeConfig } = config;

export interface SnakeSegment {
    x: number;
    y: number;
    angle: number;
    sprite: PIXI.Sprite;
    glowSprite: PIXI.Sprite;
}

export interface PathPoint {
    x: number;
    y: number;
    z: number;
}

export class SnakeState {
    public segments: SnakeSegment[] = [];
    public head!: SnakeSegment;
    public score: number = 10;
    public colors: number[];
    public speed: number = snakeConfig.BASE_SPEED;
    public boostSpeed: number = this.speed * snakeConfig.BOOST_SPEED_MULTIPLIER;
    public isBoosting: boolean = false;
    public currentSpeed: number = this.speed;
    public canBoost: boolean = true;
    public respawnGracePeriod: number = 0;
    public targetAngle: number = 0;
    public currentAngle: number = 0;
    public turnSpeed: number = snakeConfig.TURN_SPEED_SENSITIVITY;
    public path: CircularBuffer<PathPoint>;
    public trueLength: number = 0;
    public visualLength: number = 0;
    public lengthLostFromBoost: number = 0;
    public previousBoostValue: number = 0.1;
    public zIndex: number = 0;
    public serverHead: { x: number, y: number } | null = null;
    public needsCorrection: boolean = false;
    public username: string = ""
    public currentSegmentSpacing: number;
    public isSpectator: boolean=false
    

    constructor(colors: number[], username: string) {
        this.colors = colors;
        this.username = username;
        this.path = new CircularBuffer<PathPoint>(snakeConfig.PATH_BUFFER_SIZE);
        this.currentSegmentSpacing = snakeConfig.BASE_SEGMENT_SPACING; 
   
    }

    public reset(): void {
        this.segments.forEach(segment => segment.sprite.destroy());
        this.segments = [];
        this.visualLength = snakeConfig.INITIAL_SEGMENT_COUNT;
        this.score = 0;
        this.speed = snakeConfig.BASE_SPEED;
        this.isBoosting = false;
    }
}
