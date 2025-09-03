import { config } from 'shared';
import { Player } from '../types/AppTypes';
import { SnakeSegment, Vector2 } from 'shared';
import { FoodManager } from './FoodManager';
import { InputPayload } from 'shared';

function MLerp(start: number, end: number, amt: number): number {
    return (1 - amt) * start + amt * end;
}

export class Snake {
    public id: string;
    public username: string;
    public segments: SnakeSegment[] = [];
    public radius: number = config.snake.BASE_SEGMENT_RADIUS;
    public score: number = 0;
    public isBoosting: boolean = false;
    public color: number;

    private targetX: number = 0;
    private targetY: number = 0;
    private angle: number = 0;
    private speed: number = config.snake.BASE_SPEED;
    private lerpFactor: number = 0.2;

    public length: number = config.snake.INITIAL_SEGMENT_COUNT;
    public lastProcessedInput: number = 0;
    public pendingInputs: InputPayload[] = [];

    private lengthDrainedForNextFood: number = 0;
    private nextFoodDropThreshold: number = 0;

    public knownFood: Set<number> = new Set();
    public segmentsChanged: boolean = true;
    public previousSegments: SnakeSegment[] = [];

    public cashUSD: number = 0;
    public kills: number = 0;
    public entryLength: number;
    public entryslitherAmount: number = 0;
    public entryUSDRate: number = 0;

    private trueLength: number = config.snake.INITIAL_SEGMENT_COUNT;
    private visualLength: number = config.snake.INITIAL_SEGMENT_COUNT;
    private canBoost: boolean = true;
    private respawnGracePeriod: number = 0;

    private isSpectator = false;

    constructor(player: Player, startPos: Vector2, entryData?: { cashUSD: number, slitherAmount: number, usdRate: number, isSpectator?: boolean }) {
        if (entryData) {
            this.cashUSD = entryData.cashUSD;
            this.entryslitherAmount = entryData.slitherAmount;
            this.entryUSDRate = entryData.usdRate;
            this.entryLength = Math.floor(this.entryslitherAmount * 1000);
            this.length = this.entryLength;
            this.trueLength = this.entryLength;
            this.visualLength = this.entryLength;
            if(entryData.isSpectator){
                this.isSpectator = entryData.isSpectator
            }
        } else {
            this.length = config.snake.INITIAL_SEGMENT_COUNT;
            this.trueLength = config.snake.INITIAL_SEGMENT_COUNT;
            this.visualLength = config.snake.INITIAL_SEGMENT_COUNT;
        }

        this.id = player.id;
        this.username = player.username;
        this.color = config.snake.COLORS[Math.floor(Math.random() * config.snake.COLORS.length)];

        this.angle = Math.random() * Math.PI * 2;
        this.targetX = startPos.x;
        this.targetY = startPos.y;

        this.initializeSegments(startPos);

        this.score = this.length * config.snake.SCORE_PER_LENGTH_UNIT;
        this.setNextFoodDropThreshold();

        this.previousSegments = this.segments.map(seg => ({ ...seg }));
    }

    private initializeSegments(startPos: Vector2): void {
        this.segments = [];

        const head: SnakeSegment = { ...startPos, angle: this.angle };
        this.segments.push(head);

        for (let i = 1; i < this.length; i++) {
            const spacing = config.snake.BASE_SEGMENT_SPACING * (this.radius / config.snake.BASE_SEGMENT_RADIUS);
            const pos = {
                x: startPos.x,
                y: startPos.y,
            };
            this.segments.push({ ...pos, angle: this.angle });
        }
    }

    public applyInput(input: InputPayload) {

        const distance = 100;
        this.targetX = this.segments[0].x + Math.cos(input.targetAngle) * distance;
        this.targetY = this.segments[0].y + Math.sin(input.targetAngle) * distance;

        if (input.isBoosting && this.length >= config.snake.MIN_BOOST_LENGTH && this.canBoost) {
            this.isBoosting = true;
            this.speed = config.snake.BASE_SPEED * config.snake.BOOST_SPEED_MULTIPLIER;
        } else {
            this.isBoosting = false;
            this.speed = config.snake.BASE_SPEED;
        }
    }

    public update(deltaTime: number, foodManager: FoodManager): void {
        this.previousSegments = this.segments.map(seg => ({ ...seg }));
        this.segmentsChanged = false;

        if (!this.canBoost) {
            this.respawnGracePeriod -= deltaTime;
            if (this.respawnGracePeriod <= 0) {
                this.canBoost = true;
            }
        }

        if (this.isBoosting && this.length < config.snake.MIN_BOOST_LENGTH) {
            this.isBoosting = false;
            this.speed = config.snake.BASE_SPEED;
        }

        this.updateV2Physics(deltaTime);

        if (this.isBoosting) {
            const drainAmount = config.snake.LENGTH_DRAIN_RATE_PER_TICK * deltaTime;

            if (this.length - drainAmount > config.snake.INITIAL_SEGMENT_COUNT) {
                this.length -= drainAmount;
                this.trueLength = this.length;
                this.score -= drainAmount * config.snake.SCORE_PER_LENGTH_UNIT;
                this.lengthDrainedForNextFood += drainAmount;

                if (this.lengthDrainedForNextFood >= this.nextFoodDropThreshold) {
                    this.dropFood(foodManager);
                    this.lengthDrainedForNextFood -= this.nextFoodDropThreshold;
                    this.setNextFoodDropThreshold();
                }
            } else {
                this.isBoosting = false;
                this.speed = config.snake.BASE_SPEED;
            }
        }

        this.updateGrowth();

        this.updateSegmentCount();

        this.updateRadius();

        this.segmentsChanged = this.hasSegmentsChanged();
    }

    private updateV2Physics(deltaTime: number): void {
        const head = this.segments[0];
        const deltaSeconds = deltaTime;

        const deltaX = this.targetX - head.x;
        const deltaY = this.targetY - head.y;
        const targetAngle = Math.atan2(deltaY, deltaX);

        let angleDifference = targetAngle - this.angle;
        while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
        while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

        const maxTurnThisFrame = config.snake.TURN_SPEED * deltaSeconds;

        const turnAmount = Math.max(-maxTurnThisFrame, Math.min(maxTurnThisFrame, angleDifference));

        this.angle += turnAmount;

        while (this.angle > Math.PI) this.angle -= 2 * Math.PI;
        while (this.angle < -Math.PI) this.angle += 2 * Math.PI;

        const speedThisFrame = this.speed * deltaSeconds;
        head.x += Math.cos(this.angle) * speedThisFrame;
        head.y += Math.sin(this.angle) * speedThisFrame;
        head.angle = this.angle;

        this.updateSegmentsV2(deltaSeconds);
    }

    private updateSegmentsV2(deltaSeconds: number): void {
        const baseSpeed = config.snake.BASE_SPEED;
        const speedRatio = this.speed / baseSpeed;

        const adjustedLerpFactor = Math.min(this.lerpFactor * (1 + (speedRatio - 1) * 0.5) * deltaSeconds, 1.0);

        for (let i = 1; i < this.segments.length; i++) {
            const current = this.segments[i];
            const leader = this.segments[i - 1];

            current.x = MLerp(current.x, leader.x, adjustedLerpFactor);
            current.y = MLerp(current.y, leader.y, adjustedLerpFactor);

            const dx = leader.x - current.x;
            const dy = leader.y - current.y;
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - current.angle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                const segmentTurnFactor = Math.min(0.3 * deltaSeconds, 0.5);
                current.angle += angleDiff * segmentTurnFactor;
            }
        }
    }

    private updateGrowth(): void {
        this.visualLength += (this.trueLength - this.visualLength) * config.snake.GROWTH_ANIMATION_SPEED;
    }

    private updateSegmentCount(): void {
        const targetSegmentCount = Math.ceil(this.visualLength);

        while (this.segments.length < targetSegmentCount) {
            const lastSegment = this.segments[this.segments.length - 1];
            this.segments.push({ ...lastSegment });
        }

        while (this.segments.length > targetSegmentCount && this.segments.length > config.snake.INITIAL_SEGMENT_COUNT) {
            this.segments.pop();
        }
    }

    private hasSegmentsChanged(): boolean {
        if (this.segments.length !== this.previousSegments.length) {
            return true;
        }

        for (let i = 0; i < this.segments.length; i++) {
            const current = this.segments[i];
            const previous = this.previousSegments[i];

            if (Math.abs(current.x - previous.x) > 1 ||
                Math.abs(current.y - previous.y) > 1 ||
                Math.abs(current.angle - previous.angle) > 0.1) {
                return true;
            }
        }

        return false;
    }

    private setNextFoodDropThreshold(): void {
        const { BOOST_LENGTH_TO_DROP_MIN, BOOST_LENGTH_TO_DROP_MAX } = config.snake;
        this.nextFoodDropThreshold = Math.random() * (BOOST_LENGTH_TO_DROP_MAX - BOOST_LENGTH_TO_DROP_MIN) + BOOST_LENGTH_TO_DROP_MIN;
    }

    private dropFood(foodManager: FoodManager): void {
        const dropPoint = this.segments[this.segments.length - 1];

        if (dropPoint) {
            let foodValue = 0.5 + Math.random() * 1.0;
            foodManager.spawnFood(
                { x: dropPoint.x, y: dropPoint.y },
                foodValue,
                false,
                undefined
            );
        }
    }

    public grow(amount: number): void {
        this.trueLength += amount * config.snake.SEGMENT_GROWTH_MULTIPLIER;
        this.length = this.trueLength;
        this.score += amount * config.snake.SCORE_PER_LENGTH_UNIT;
    }

    private updateRadius(): void {
        const growth = Math.min(this.length - 10, config.snake.MAX_GROWTH_LENGTH) * config.snake.GROWTH_FACTOR;
        this.radius = config.snake.BASE_SEGMENT_RADIUS * (1 + growth);
    }

    public getHead(): SnakeSegment {
        return this.segments[0];
    }

    public getCollisionHead(): SnakeSegment {
        return this.segments[0];
    }

    public getSegmentsCopy(): SnakeSegment[] {
        return this.segments.map(seg => ({ ...seg }));
    }

    public hasMovedSignificantly(): boolean {
        return this.segmentsChanged;
    }

    public getCurrentAngle(): number {
        return this.angle;
    }

    public reset(startPos: Vector2): void {
        this.trueLength = config.snake.INITIAL_SEGMENT_COUNT;
        this.visualLength = config.snake.INITIAL_SEGMENT_COUNT;
        this.length = config.snake.INITIAL_SEGMENT_COUNT;
        this.score = 0;
        this.isBoosting = false;
        this.canBoost = false;
        this.respawnGracePeriod = 100;

        this.angle = Math.random() * Math.PI * 2;
        this.targetX = startPos.x;
        this.targetY = startPos.y;
        this.speed = config.snake.BASE_SPEED;

        this.initializeSegments(startPos);
        this.previousSegments = this.segments.map(seg => ({ ...seg }));
    }

    public setTrueLength(length: number): void {
        this.trueLength = length;
        this.length = length;
    }

    public updateBoostState(isBoosting: boolean): void {
        if (isBoosting === this.isBoosting) {
            return;
        }

        if (isBoosting && (this.length < config.snake.MIN_BOOST_LENGTH || !this.canBoost)) {
            this.isBoosting = false;
        } else {
            this.isBoosting = isBoosting;

            if (this.isBoosting) {
                this.speed = config.snake.BASE_SPEED * config.snake.BOOST_SPEED_MULTIPLIER;
            } else {
                this.speed = config.snake.BASE_SPEED;
            }
        }
    }
}