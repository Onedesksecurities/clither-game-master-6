import * as PIXI from 'pixi.js';
import { SnakeState, SnakeSegment } from './SnakeState';
import { GraphicsUtils } from '../../utils/Graphics';

import { config } from 'shared';

const { snake: snakeConfig } = config;
function saturateColorHSV(hex: number, factor: number): number {

    let r = ((hex >> 16) & 0xFF) / 255;
    let g = ((hex >> 8) & 0xFF) / 255;
    let b = (hex & 0xFF) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = (max === 0) ? 0 : delta / max;
    const v = max;

    if (delta !== 0) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = ((b - r) / delta) + 2;
        else h = ((r - g) / delta) + 4;
        h *= 60;
        if (h < 0) h += 360;
    }

    s = Math.max(0, Math.min(1, s * factor));

    const C = v * s;
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - C;

    let r1 = 0, g1 = 0, b1 = 0;
    if (0 <= h && h < 60) { r1 = C; g1 = X; b1 = 0; }
    else if (60 <= h && h < 120) { r1 = X; g1 = C; b1 = 0; }
    else if (120 <= h && h < 180) { r1 = 0; g1 = C; b1 = X; }
    else if (180 <= h && h < 240) { r1 = 0; g1 = X; b1 = C; }
    else if (240 <= h && h < 300) { r1 = X; g1 = 0; b1 = C; }
    else { r1 = C; g1 = 0; b1 = X; }

    const R = Math.round((r1 + m) * 255);
    const G = Math.round((g1 + m) * 255);
    const B = Math.round((b1 + m) * 255);

    return (R << 16) | (G << 8) | B;
}

export class SnakeAppearance {
    private state: SnakeState;
    private renderer: PIXI.Renderer;
    private mainContainer: PIXI.Container;
    private glowContainer: PIXI.Container;
    private headingArrow: PIXI.Sprite;
    private headEyes!: PIXI.Container;
    private leftPupil!: PIXI.Graphics;
    private rightPupil!: PIXI.Graphics;

    private boostEffectTime: number = 0;
    private arrowBlinkTime: number = 0;
    private boostEffectActive: boolean = false;
    private boostFadeOutTime: number = 0;
    private segmentTextures: PIXI.Texture[] = [];
    private usernameText: PIXI.Text;

    constructor(state: SnakeState, renderer: PIXI.Renderer, mainContainer: PIXI.Container, glowContainer: PIXI.Container) {
        this.state = state;
        this.renderer = renderer;
        this.mainContainer = mainContainer;
        this.glowContainer = glowContainer;

        this.segmentTextures = GraphicsUtils.getGrayscaleSegmentTextures(snakeConfig.BRIGHTNESS_PATTERN, 32, this.renderer);
        const arrowTexture = GraphicsUtils.createHeadingArrowTexture(this.renderer, this.state.colors[0]);
        this.headingArrow = new PIXI.Sprite(arrowTexture);
        this.headingArrow.anchor.set(0.5, 0.5);
        this.headingArrow.visible = false;

        this.usernameText = new PIXI.Text(this.state.username, {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 0xffffff,
            align: 'center',
            strokeThickness: 4,
        });
        this.usernameText.anchor.set(0.5);
        this.mainContainer.addChild(this.usernameText);
        this.mainContainer.addChild(this.headingArrow);
        this.headEyes = new PIXI.Container();
        this.mainContainer.addChild(this.headEyes);

    }

    public update(deltaTime: number, zoom: number, joystickPointerDistance: number, screenBounds: PIXI.Rectangle): void {
        if (this.state.isSpectator) {
            this.mainContainer.visible = false
        }
        this.updateSpritePositions();
        this.updateBoostVisuals(deltaTime);
        this.updateHeadingArrow(deltaTime, joystickPointerDistance, screenBounds, zoom);
        this.updateHeadAndEyes();
        this.updateUsernamePosition();
    }

    private updateUsernamePosition(): void {
        const head = this.state.head;
        this.usernameText.position.set(head.x, head.y + this.getCurrentRadius() + 15);
        this.usernameText.rotation = 0;
    }

    public addSegment(x: number, y: number): void {
        const segment: SnakeSegment = {
            x,
            y,
            angle: this.state.currentAngle,
            sprite: new PIXI.Sprite(PIXI.Texture.EMPTY),
            glowSprite: new PIXI.Sprite(PIXI.Texture.EMPTY)
        };
        segment.sprite.anchor.set(0.5);
        segment.glowSprite.anchor.set(0.5);
        segment.glowSprite.blendMode = PIXI.BLEND_MODES.ADD;
        this.state.segments.push(segment);
        this.mainContainer.addChildAt(segment.sprite, 0);
        this.glowContainer.addChildAt(segment.glowSprite, 0);
    }

    public removeSegment(): void {
        if (this.state.segments.length <= 10) return;
        const removedSegment = this.state.segments.pop();
        if (removedSegment) {
            removedSegment.sprite.destroy();
            removedSegment.glowSprite.destroy();
        }
    }

    public resizeAllSegments(): void {
        const glowTexture = GraphicsUtils.createGlowTexture();

        for (let i = 0; i < this.state.segments.length; i++) {
            const segment = this.state.segments[i];
            const textureIndex = i % snakeConfig.BRIGHTNESS_PATTERN.length;
            const segmentTexture = this.segmentTextures[textureIndex];
            const segmentColor = this.state.colors[i % this.state.colors.length];
            segment.sprite.texture = segmentTexture;
            segment.sprite.tint = segmentColor;
            segment.glowSprite.texture = glowTexture;
            segment.glowSprite.tint = snakeConfig.SAME_GLOW_COLOR ? segmentColor : snakeConfig.GLOW_COLOR;
        }
        this.updateHeadSprite();
    }

    private updateHeadSprite(): void {
        this.headEyes.removeChildren();
        const { container: eyesSprite, leftPupil, rightPupil } = GraphicsUtils.createSnakeHead(this.getCurrentRadius());
        this.leftPupil = leftPupil;
        this.rightPupil = rightPupil;
        this.headEyes.addChild(eyesSprite);
    }

    private updateSpritePositions(): void {
        const baseScale = this.getCurrentRadius() / 32;
        const glowScale = this.getCurrentRadius() * snakeConfig.GLOW_SIZE_MULTIPLIER / 32;
        const numberOfFullSegments = Math.floor(this.state.visualLength);
        const lastSegmentGrowth = this.state.visualLength - numberOfFullSegments;

        for (let i = 0; i < this.state.segments.length; i++) {
            const segment = this.state.segments[i];
            segment.sprite.position.set(segment.x, segment.y);
            segment.sprite.rotation = segment.angle;
            segment.glowSprite.position.set(segment.x, segment.y);
            segment.glowSprite.rotation = segment.angle;

            let scale = (i === this.state.segments.length - 1 && i >= numberOfFullSegments)
                ? lastSegmentGrowth
                : 1.0;

            segment.sprite.scale.set(baseScale * scale);
            segment.glowSprite.scale.set(glowScale * scale);
        }
    }

    private updateBoostVisuals(deltaTime: number): void {
        if (this.state.isBoosting) {
            this.boostEffectActive = true;
            this.glowContainer.visible = true;
            this.boostFadeOutTime = snakeConfig.BOOST_FADE_DURATION_S;
            this.glowContainer.alpha = 1.0;
            this.boostEffectTime += deltaTime;

            for (let i = 0; i < this.state.segments.length; i++) {
                const segment = this.state.segments[i];
                segment.glowSprite.alpha = snakeConfig.BOOST_GLOW_MIN_ALPHA;
            }

            for (let i = 0; i < this.state.segments.length; i++) {
                const segment = this.state.segments[i];
                const phase = (this.boostEffectTime * snakeConfig.BOOST_GLOW_SPEED - i / snakeConfig.BOOST_GLOW_WAVELENGTH) * Math.PI * 2;
                const normalized = (Math.sin(phase) + 1) / 2;
                const darkeningFactor = Math.max(1, normalized + 0.5);
                const originalColor = this.state.colors[i % this.state.colors.length];
                segment.sprite.tint = saturateColorHSV(originalColor, darkeningFactor)
            }
        }

        if (!this.state.isBoosting && this.boostEffectActive) {
            this.boostFadeOutTime -= deltaTime; // UPDATED
            const fadeAlpha = Math.max(0, this.boostFadeOutTime / snakeConfig.BOOST_FADE_DURATION_S);
            this.glowContainer.alpha = fadeAlpha;

            for (let i = 0; i < this.state.segments.length; i++) {
                const segment = this.state.segments[i];
                segment.sprite.tint = this.state.colors[i % this.state.colors.length];
            }

            if (fadeAlpha <= 0) {
                this.boostEffectActive = false;
                this.glowContainer.visible = false;
                for (const segment of this.state.segments) {
                    segment.glowSprite.alpha = 0;
                }
            }
        }
    }

    private updateHeadingArrow(deltaTime: number, joystickPointerDistance: number, screenBounds: PIXI.Rectangle, zoom: number): void {
        if (!this.headingArrow.visible) return;

        const angle = this.state.targetAngle;
        const arrowDistanceInWorld = joystickPointerDistance / zoom;
        const arrowX = this.state.head.x + Math.cos(angle) * (arrowDistanceInWorld + 30);
        const arrowY = this.state.head.y + Math.sin(angle) * (arrowDistanceInWorld + 30);
        this.headingArrow.position.set(arrowX, arrowY);
        this.headingArrow.rotation = angle;

        const baseScale = this.getCurrentRadius() / 12.0;
        const dynamicScale = snakeConfig.HEADING_ARROW_MIN_SCALE_MOD + (arrowDistanceInWorld / (screenBounds.width / 2 / zoom)) * (snakeConfig.HEADING_ARROW_MAX_SCALE_MOD - snakeConfig.HEADING_ARROW_MIN_SCALE_MOD);
        this.headingArrow.scale.set(baseScale * dynamicScale);

        if (this.state.isBoosting) {
            this.arrowBlinkTime += deltaTime;
            this.headingArrow.alpha = 0.6 + 0.4 * Math.sin(this.arrowBlinkTime * (snakeConfig.HEADING_ARROW_BLINK_SPEED / 60));
        } else {
            this.headingArrow.alpha = Math.min(1.0, this.headingArrow.alpha + snakeConfig.HEADING_ARROW_BOOST_RETURN_SPEED * deltaTime * 2);
            this.arrowBlinkTime = 0;
        }
    }

    private updateHeadAndEyes(): void {
        this.headEyes.position.set(this.state.head.x, this.state.head.y);
        this.headEyes.rotation = this.state.head.angle;

        if (!this.leftPupil || !this.rightPupil) return;
        const headAngle = this.state.head.angle;
        const eyeRadius = this.getCurrentRadius() * snakeConfig.EYE_RADIUS_FACTOR;
        const maxPupilDist = eyeRadius * snakeConfig.PUPIL_DISTANCE_FACTOR;
        const orbitOffsetX = eyeRadius * snakeConfig.PUPIL_ORBIT_OFFSET_FACTOR;

        const angleToTarget = this.state.targetAngle - headAngle;
        const topPupilAngle = angleToTarget + snakeConfig.PUPIL_TILT_ANGLE;
        const bottomPupilAngle = angleToTarget - snakeConfig.PUPIL_TILT_ANGLE;

        this.leftPupil.position.set(
            Math.cos(topPupilAngle) * maxPupilDist - orbitOffsetX,
            Math.sin(topPupilAngle) * maxPupilDist
        );
        this.rightPupil.position.set(
            Math.cos(bottomPupilAngle) * maxPupilDist - orbitOffsetX,
            Math.sin(bottomPupilAngle) * maxPupilDist
        );
    }
    public setHeadingArrowVisible(visible: boolean): void { this.headingArrow.visible = visible; }
    public getCurrentRadius(): number {
        const growth = Math.min(this.state.segments.length - 10, snakeConfig.MAX_GROWTH_LENGTH) * snakeConfig.GROWTH_FACTOR;
        return snakeConfig.BASE_SEGMENT_RADIUS * (1 + growth);
    }

    public reset(): void {
    }
}
