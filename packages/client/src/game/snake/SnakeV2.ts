import * as PIXI from 'pixi.js';
import { SnakeState } from './SnakeState';
import { SnakeAppearance } from './SnakeAppearance';

import { CompactSnakeStateUpdate, config, SnakeStateUpdate } from 'shared';
import { SnakeSegment as ServerSnakeSegment } from 'shared'

const { snake: snakeConfig } = config;

function MLerp(start: number, end: number, amt: number): number {
    return (1 - amt) * start + amt * end;
}

export class SnakeV2 {
    public id: string = '';
    private state: SnakeState;
    private appearance: SnakeAppearance;
    private renderer: PIXI.Renderer;
    private container: PIXI.Container;
    private mainContainer: PIXI.Container;
    private glowContainer: PIXI.Container;
    private lastRadius: number = 0;

    private targetX: number = 0;
    private targetY: number = 0;
    private angle: number = 0;
    private speed: number = 5;
    private lerpFactor: number = 0.2;

    private authoritativeState: { time: number, head: { x: number, y: number, angle: number } } | null = null;

    public get isSpectator(): boolean { return this.state.isSpectator }
    public get isBoosting(): boolean { return this.state.isBoosting; }
    public get currentAngle(): number { return this.angle; }
    public getTargetAngle(): number { return Math.atan2(this.targetY - this.state.head.y, this.targetX - this.state.head.x); }

    public isDying: boolean = false;
    public collided: boolean = false;
    public username: string;

    private isServerInitialized: boolean = false;

    constructor(x: number, y: number, colors: number[], renderer: PIXI.Renderer, username: string, serverData?: SnakeStateUpdate) {
        this.renderer = renderer;
        this.username = username;

        this.state = new SnakeState(colors, username);
        this.container = new PIXI.Container();
        this.mainContainer = new PIXI.Container();
        this.glowContainer = new PIXI.Container();
        this.glowContainer.visible = false;
        this.container.addChild(this.mainContainer, this.glowContainer);

        this.appearance = new SnakeAppearance(this.state, this.renderer, this.mainContainer, this.glowContainer);

        if (serverData) {
            console.log(serverData);
            this.state.isSpectator = serverData.isSpectator;
            this.initializeFromServerData(serverData);
        } else {
            const initialAngle = Math.random() * Math.PI * 2;
            this.initializeSnake(x, y, initialAngle, snakeConfig.INITIAL_SEGMENT_COUNT);
            this.angle = initialAngle;
            this.targetX = x;
            this.targetY = y;
            this.speed = snakeConfig.BASE_SPEED;
        }
    }

    public initializeFromServerData(serverSnake: SnakeStateUpdate): void {
        if (!serverSnake.segments || serverSnake.segments.length === 0) {
            console.error("Cannot initialize snake from server data without segments:", serverSnake);
            return;
        }

        this.isServerInitialized = true;

        this.state.segments.forEach(segment => {
            segment.sprite.destroy();
            segment.glowSprite.destroy();
        });
        this.state.segments = [];
        this.state.path.clear();

        this.state.trueLength = serverSnake.length;
        this.state.visualLength = serverSnake.segments.length;
        this.state.isBoosting = serverSnake.isBoosting;
        this.state.score = serverSnake.score;

        const serverHead = serverSnake.segments[0];
        this.angle = serverHead.angle;
        this.state.currentAngle = serverHead.angle;
        this.state.targetAngle = serverHead.angle;

        const targetDistance = 100;
        this.targetX = serverHead.x + Math.cos(serverHead.angle) * targetDistance;
        this.targetY = serverHead.y + Math.sin(serverHead.angle) * targetDistance;

        if (this.state.isBoosting) {
            this.speed = snakeConfig.BASE_SPEED * snakeConfig.BOOST_SPEED_MULTIPLIER;
        } else {
            this.speed = snakeConfig.BASE_SPEED;
        }

        for (let i = 0; i < serverSnake.segments.length; i++) {
            const serverSeg = serverSnake.segments[i];
            this.appearance.addSegment(serverSeg.x, serverSeg.y);

            const clientSeg = this.state.segments[i];
            clientSeg.x = serverSeg.x;
            clientSeg.y = serverSeg.y;
            clientSeg.angle = serverSeg.angle;
        }

        if (this.state.segments.length > 0) {
            this.state.head = this.state.segments[0];
        }

        this.state.zIndex = 0;

        this.appearance.resizeAllSegments();
        this.lastRadius = this.getCurrentRadius();
    }

    public addStateToBuffer(newState: { time: number, head: { x: number, y: number, angle: number } }): void {
        this.authoritativeState = newState;

        const targetDistance = 100;
        this.targetX = newState.head.x + Math.cos(newState.head.angle) * targetDistance;
        this.targetY = newState.head.y + Math.sin(newState.head.angle) * targetDistance;
    }

    public getHeadSegment(): ServerSnakeSegment {
        return this.state.segments[0];
    }

    public getCollisionHead(): ServerSnakeSegment {
        return this.state.segments[0];
    }

    public getSegments(): ServerSnakeSegment[] {
        return this.state.segments;
    }

    public initializeSnake(x: number, y: number, initialAngle: number, length: number): void {
        if (this.isServerInitialized) {
            return;
        }

        this.state.trueLength = length;
        this.state.visualLength = length;
        this.state.currentAngle = initialAngle;
        this.state.targetAngle = this.state.currentAngle;
        this.state.path.length = 0;

        this.state.head = { x, y, angle: initialAngle, sprite: new PIXI.Sprite(), glowSprite: new PIXI.Sprite() };
        this.state.serverHead = { x, y };

        this.state.segments = [];

        this.appearance.addSegment(x, y);
        this.state.segments[0].angle = initialAngle;

        for (let i = 1; i < length; i++) {
            this.appearance.addSegment(x, y);
            this.state.segments[i].angle = initialAngle;
        }

        if (this.state.segments.length > 0) {
            this.state.head = this.state.segments[0];
        }
        this.appearance.resizeAllSegments();
    }

    public setServerState(serverSnake: CompactSnakeStateUpdate): void {
        this.state.trueLength = serverSnake.length;
        this.state.isBoosting = serverSnake.isBoosting;
        this.state.score = serverSnake.score;

        while (this.state.segments.length < serverSnake.length) {
            this.appearance.addSegment(0, 0);
        }
        while (this.state.segments.length > serverSnake.length) {
            this.appearance.removeSegment();
        }


        if (this.state.segments.length > 0) {
            this.state.currentAngle = this.state.segments[0].angle;
            this.state.head = this.state.segments[0];
            this.angle = this.state.currentAngle;

            const targetDistance = 100;
            this.targetX = this.state.head.x + Math.cos(this.angle) * targetDistance;
            this.targetY = this.state.head.y + Math.sin(this.angle) * targetDistance;
        }
    }

    public applyInput(input: { targetAngle: number; isBoosting: boolean }): void {
        const distance = 100;
        this.targetX = this.state.head.x + Math.cos(input.targetAngle) * distance;
        this.targetY = this.state.head.y + Math.sin(input.targetAngle) * distance;

        this.state.isBoosting = input.isBoosting;
        if (this.state.isBoosting) {
            this.speed = snakeConfig.BASE_SPEED * snakeConfig.BOOST_SPEED_MULTIPLIER;
        } else {
            this.speed = snakeConfig.BASE_SPEED;
        }
    }

    public snakeRelease() {
        this.collided = false;
    }

    public snakeCollided() {
        this.collided = true;
    }

    public update(isLocalPlayer: boolean, zoom: number, deltaTime: number, joystickPointerDistance: number, screenBounds: PIXI.Rectangle): void {
        if (this.collided) return;

        if (!this.state.canBoost) {
            this.state.respawnGracePeriod -= deltaTime;
            if (this.state.respawnGracePeriod <= 0) {
                this.state.canBoost = true;
            }
        }

        if (isLocalPlayer) {
            this.updateV2Physics(deltaTime);
        } else {
            this.updateRemote(deltaTime);
        }

        if (this.getCurrentRadius() !== this.lastRadius) {
            this.appearance.resizeAllSegments();
            this.lastRadius = this.getCurrentRadius();
        }

        this.updateGrowth();
        this.appearance.update(deltaTime, zoom, joystickPointerDistance, screenBounds);
    }

    private updateV2Physics(deltaTime: number): void {
        const head = this.state.head;
        const deltaSeconds = deltaTime;

        const deltaX = this.targetX - head.x;
        const deltaY = this.targetY - head.y;
        const targetAngle = Math.atan2(deltaY, deltaX);

        let angleDifference = targetAngle - this.angle;
        while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
        while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

        const maxTurnThisFrame = snakeConfig.TURN_SPEED * deltaSeconds;

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
        const baseSpeed = snakeConfig.BASE_SPEED;
        const speedRatio = this.speed / baseSpeed;
        const adjustedLerpFactor = Math.min(this.lerpFactor * (1 + (speedRatio - 1) * 0.5) * deltaSeconds, 1.0);

        for (let i = 1; i < this.state.segments.length; i++) {
            const current = this.state.segments[i];
            const leader = this.state.segments[i - 1];

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

    private updateRemote(deltaTime: number): void {
        this.updateV2Physics(deltaTime);

        if (this.authoritativeState) {
            const dx = this.authoritativeState.head.x - this.state.head.x;
            const dy = this.authoritativeState.head.y - this.state.head.y;

            this.state.head.x += dx * 0.1;
            this.state.head.y += dy * 0.1;

            const angleDiff = this.getShortestAngle(this.angle, this.authoritativeState.head.angle);
            this.angle += angleDiff * 0.1;
            this.state.head.angle = this.angle;
            this.state.currentAngle = this.angle;

            if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(angleDiff) < 0.05) {
                this.state.head.x = this.authoritativeState.head.x;
                this.state.head.y = this.authoritativeState.head.y;
                this.angle = this.authoritativeState.head.angle;
                this.state.currentAngle = this.authoritativeState.head.angle;
                this.authoritativeState = null;
            }
        }
    }

    private getShortestAngle(from: number, to: number): number {
        const twoPi = 2 * Math.PI;
        const difference = (to - from) % twoPi;
        return difference > Math.PI ? difference - twoPi : difference < -Math.PI ? difference + twoPi : difference;
    }

    public setServerAuthoritativeState(head: { x: number; y: number; angle: number }): void {
        this.state.serverHead = head;
        this.state.needsCorrection = true;
    }

    private updateGrowth(): void {
        this.state.visualLength += (this.state.trueLength - this.state.visualLength) * snakeConfig.GROWTH_ANIMATION_SPEED;

        if (this.state.segments.length < Math.ceil(this.state.visualLength)) {
            const lastSegment = this.state.segments[this.state.segments.length - 1];
            this.appearance.addSegment(lastSegment.x, lastSegment.y);
            this.appearance.resizeAllSegments();
        }

        while (this.state.segments.length > Math.ceil(this.state.visualLength) && this.state.segments.length > 10) {
            this.appearance.removeSegment();
        }
    }

    public setTarget(x: number, y: number): void {
        this.targetX = x;
        this.targetY = y;
    }

    public setScore(score: number): void {
        this.state.score = score;
    }

    public updateBoostState(isBoosting: boolean): void {
        if (isBoosting === this.state.isBoosting) {
            return;
        }

        if (isBoosting && (this.state.trueLength < snakeConfig.MIN_BOOST_LENGTH || !this.state.canBoost)) {
            this.state.isBoosting = false;
        } else {
            this.state.isBoosting = isBoosting;

            if (this.state.isBoosting) {
                this.speed = snakeConfig.BASE_SPEED * snakeConfig.BOOST_SPEED_MULTIPLIER;
            } else {
                this.speed = snakeConfig.BASE_SPEED;
            }
        }
    }

    public reset(): void {
        this.state.reset();
        this.appearance.reset();
        const newAngle = Math.random() * Math.PI * 2;
        this.initializeSnake(0, 0, newAngle, snakeConfig.INITIAL_SEGMENT_COUNT);
        this.angle = newAngle;
        this.targetX = 0;
        this.targetY = 0;
        this.isServerInitialized = false;
    }

    public setTrueLength(length: number): void {
        this.state.trueLength = length;
    }

    public destroy(): void {
        this.container.destroy({ children: true });
    }

    public setHeadingArrowVisible(visible: boolean): void {
        this.appearance.setHeadingArrowVisible(visible);
    }

    public grow(amount: number): void {
        this.state.trueLength += amount * snakeConfig.SEGMENT_GROWTH_MULTIPLIER;
        this.state.score += amount * snakeConfig.SCORE_PER_LENGTH_UNIT;
    }

    public getScore(): number { return this.state.score; }
    public setTargetAngle(angle: number): void {
        const distance = 100;
        this.targetX = this.state.head.x + Math.cos(angle) * distance;
        this.targetY = this.state.head.y + Math.sin(angle) * distance;
        this.state.targetAngle = angle;
    }
    public getLength(): number { return this.state.segments.length; }
    public getContainer(): PIXI.Container { return this.container; }
    public getHeadPosition(): { x: number; y: number } { return { x: this.state.head.x, y: this.state.head.y }; }
    public getCurrentRadius(): number {
        const growth = Math.min(this.state.segments.length - 10, snakeConfig.MAX_GROWTH_LENGTH) * snakeConfig.GROWTH_FACTOR;
        return snakeConfig.BASE_SEGMENT_RADIUS * (1 + growth);
    }

    public startDeathAnimation(onComplete: () => void): void {
        this.isDying = true;
        const fadeDuration = 1.2;
        let elapsed = 0;
        const ticker = PIXI.Ticker.shared;

        const fade = () => {
            elapsed += ticker.deltaMS / 1000;
            const progress = Math.min(elapsed / fadeDuration, 1);
            const alpha = 1 - progress;

            this.container.alpha = alpha;

            if (progress >= 1) {
                ticker.remove(fade);
                onComplete();
            }
        };

        ticker.add(fade);
    }
}