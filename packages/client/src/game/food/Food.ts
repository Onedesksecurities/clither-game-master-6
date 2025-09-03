import * as PIXI from 'pixi.js';
import { SnakeV2 as Snake } from '../snake/SnakeV2';

export class Food {
    public id: number = -1;
    public sprite: PIXI.Sprite;
    public x: number;
    public y: number;
    public radius: number;
    public value: number;
    public isBeingAttracted: boolean = false;
    public originalScale: number = 1;
    public attractionStartDistance: number = 0;
    public attractionTarget: Snake | null = null;
    public isPredicted?: boolean = false;

    private wiggleTime: number = 0;
    private wiggleSpeed: number;
    private wiggleAmplitude: number;
    private wiggleOffsetX: number;
    private wiggleOffsetY: number;

    constructor(x: number, y: number, radius: number, value: number, texture: PIXI.Texture, isDeathFood?: boolean) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.value = value;

        this.sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        this.sprite.texture = texture;
        this.sprite.anchor.set(0.5);
        this.sprite.position.set(x, y);

        this.wiggleTime = Math.random() * Math.PI * 2;
        this.wiggleSpeed = (isDeathFood ? 0.01 : 0.02) + Math.random() * (isDeathFood ? 0.02 : 0.05);
        this.wiggleAmplitude = (isDeathFood ? 20 : 6.0) + Math.random() * 5.0;
        this.wiggleOffsetX = (Math.random() - 0.5) * this.radius * 30;
        this.wiggleOffsetY = (Math.random() - 0.5) * this.radius * 30;
    }

    public updateWiggle(deltaTime: number): void {

        if (this.isBeingAttracted) {

            this.sprite.alpha = 1;
            return;
        }

        this.wiggleTime += this.wiggleSpeed * deltaTime;

        const wiggleX = Math.sin(this.wiggleTime + this.wiggleOffsetX) * this.wiggleAmplitude;
        const wiggleY = Math.cos(this.wiggleTime * 1.3 + this.wiggleOffsetY) * this.wiggleAmplitude * 0.7;

        this.sprite.x = this.x + wiggleX;
        this.sprite.y = this.y + wiggleY;

        const blinkValue = (Math.sin(this.wiggleTime * 2.5) + 1) / 2;

        const minAlpha = 0.6;
        const maxAlpha = 1.0;
        this.sprite.alpha = minAlpha + (maxAlpha - minAlpha) * blinkValue;
    }

    public destroy(): void {
        this.sprite.destroy();
    }

    public fadeIn(): void {
        this.sprite.alpha = 0;
        const fadeDuration = 0.05;
        let elapsed = 0;
        const ticker = PIXI.Ticker.shared;
        const fade = () => {
            elapsed += ticker.deltaMS / 1000;
            const progress = Math.min(elapsed / fadeDuration, 1);

            this.sprite.alpha = progress;
            if (progress >= 1) {

                ticker.remove(fade);
            }
        };
        ticker.add(fade);
    }
}