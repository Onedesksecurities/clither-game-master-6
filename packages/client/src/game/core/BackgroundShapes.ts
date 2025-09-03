
import * as PIXI from 'pixi.js';
import { BlurFilter } from '@pixi/filter-blur';
import { config } from 'shared';

const { WORLD_RADIUS } = config;

const SHAPE_CORE_SIZE = 200; 
const BLUR_AMOUNT = 50; 

const PADDING = BLUR_AMOUNT * 3;
const TEXTURE_WIDTH = SHAPE_CORE_SIZE + PADDING;

interface BackgroundShape {
    sprite: PIXI.Sprite;
    baseX: number;
    baseY: number;
    wiggleTime: number;
    wiggleSpeedX: number;
    wiggleSpeedY: number;
    wiggleAmplitudeX: number;
    wiggleAmplitudeY: number;
    wiggleOffsetX: number;
    wiggleOffsetY: number;
    size: number;
    radius: number;
    isVisible: boolean;
    rotationSpeed: number;
}

export class BackgroundShapes {
    private container: PIXI.Container;
    private shapes: BackgroundShape[] = [];
    private renderer: PIXI.Renderer;
    private blurredTextures: PIXI.Texture[] = [];
    private numShapes: number;

    constructor(renderer: PIXI.Renderer) {
        this.renderer = renderer;
        this.container = new PIXI.Container();
        this.container.alpha = 0.3;
        this.container.zIndex = -10;

        const worldArea = Math.PI * WORLD_RADIUS * WORLD_RADIUS;
        this.numShapes = Math.floor(worldArea / 150000); 

        this.createCachedBlurredTextures();
        this.generateNonOverlappingShapes();
    }

    private createCachedBlurredTextures(): void {
        const numUniqueShapes = 20;

        for (let i = 0; i < numUniqueShapes; i++) {
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0xFFFFFF);

            const numPoints = 5 + Math.floor(Math.random() * 4);
            const points = [];
            for (let j = 0; j < numPoints; j++) {
                const angle = (j / numPoints) * Math.PI * 2;
                const randomRadius = (SHAPE_CORE_SIZE / 2) * (0.7 + Math.random() * 0.6);
                points.push({
                    x: (TEXTURE_WIDTH / 2) + Math.cos(angle) * randomRadius,
                    y: (TEXTURE_WIDTH / 2) + Math.sin(angle) * randomRadius,
                });
            }
            graphics.moveTo((points[0].x + points[numPoints - 1].x) / 2, (points[0].y + points[numPoints - 1].y) / 2);
            for (let j = 0; j < numPoints; j++) {
                const p1 = points[j];
                const p2 = points[(j + 1) % numPoints];
                graphics.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            }
            graphics.closePath();
            graphics.endFill();

            const blurFilter = new BlurFilter();
            blurFilter.blur = BLUR_AMOUNT;
            blurFilter.quality = 15;
            graphics.filters = [blurFilter];

            const bounds = new PIXI.Rectangle(0, 0, TEXTURE_WIDTH, TEXTURE_WIDTH);
            const texture = this.renderer.generateTexture(graphics, {
                scaleMode: PIXI.SCALE_MODES.LINEAR,
                resolution: 1,
                region: bounds,
            });

            this.blurredTextures.push(texture);
            graphics.destroy();
        }
    }

    private generateNonOverlappingShapes(): void {
        const placedShapes: { x: number, y: number, radius: number }[] = [];
        const worldSize = WORLD_RADIUS * 2;
        const padding = 300;
        const maxAttempts = 50;
        const colors = config.snake.COLORS;

        for (let i = 0; i < this.numShapes; i++) {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < maxAttempts) {
                const baseX = (Math.random() - 0.5) * (worldSize - padding * 2);
                const baseY = (Math.random() - 0.5) * (worldSize - padding * 2);

                const size = 0.9 + Math.random() * 1.1;

                const collisionRadius = (TEXTURE_WIDTH / 3.5) * size;

                let hasOverlap = false;
                for (const existing of placedShapes) {
                    const distance = Math.hypot(baseX - existing.x, baseY - existing.y);
                    
                    if (distance < collisionRadius + existing.radius) {
                        hasOverlap = true;
                        break;
                    }
                }

                if (!hasOverlap) {
                    const texture = this.blurredTextures[Math.floor(Math.random() * this.blurredTextures.length)];
                    const sprite = new PIXI.Sprite(texture);
                    sprite.anchor.set(0.5);
                    sprite.position.set(baseX, baseY);
                    sprite.scale.set(size);
                    sprite.visible = false;

                    const color = colors[Math.floor(Math.random() * colors.length)];
                    sprite.tint = color;
                    sprite.blendMode = PIXI.BLEND_MODES.ADD;

                    const shape: BackgroundShape = {
                        sprite, baseX, baseY, size,
                        radius: collisionRadius, 
                        isVisible: false,
                        wiggleTime: Math.random() * 1000,
                        wiggleSpeedX: 0.005 + Math.random() * 0.001,
                        wiggleSpeedY: 0.005 + Math.random() * 0.001,
                        wiggleAmplitudeX: 100 + Math.random() * 100,
                        wiggleAmplitudeY: 100 + Math.random() * 100,
                        wiggleOffsetX: Math.random() * Math.PI * 2,
                        wiggleOffsetY: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 0.0005,
                    };

                    this.shapes.push(shape);
                    this.container.addChild(sprite);
                    placedShapes.push({ x: baseX, y: baseY, radius: collisionRadius });
                    placed = true;
                }
                attempts++;
            }
        }
    }

    public update(delta: number, cameraView: PIXI.Rectangle): void {
        const margin = 400;
        const viewLeft = cameraView.x - margin;
        const viewRight = cameraView.x + cameraView.width + margin;
        const viewTop = cameraView.y - margin;
        const viewBottom = cameraView.y + cameraView.height + margin;

        for (let i = 0; i < this.shapes.length; i++) {
            const shape = this.shapes[i];
            shape.wiggleTime += delta;

            const wiggleX = Math.sin(shape.wiggleTime * shape.wiggleSpeedX + shape.wiggleOffsetX) * shape.wiggleAmplitudeX;
            const wiggleY = Math.cos(shape.wiggleTime * shape.wiggleSpeedY + shape.wiggleOffsetY) * shape.wiggleAmplitudeY;

            shape.sprite.x = shape.baseX + wiggleX;
            shape.sprite.y = shape.baseY + wiggleY;
            shape.sprite.rotation += shape.rotationSpeed * delta;

            const pulseScale = 1 + 0.05 * Math.sin(shape.wiggleTime * (shape.wiggleSpeedX * 0.5));
            shape.sprite.scale.set(shape.size * pulseScale);

            const wasVisible = shape.isVisible;
            shape.isVisible =
                shape.sprite.x + shape.radius > viewLeft && shape.sprite.x - shape.radius < viewRight &&
                shape.sprite.y + shape.radius > viewTop && shape.sprite.y - shape.radius < viewBottom;

            if (shape.isVisible !== wasVisible) {
                shape.sprite.visible = shape.isVisible;
            }
        }
    }

    public getContainer(): PIXI.Container { return this.container; }

    public destroy(): void {
        this.blurredTextures.forEach(texture => {
            if (texture && !texture.destroyed) {
                texture.destroy(true);
            }
        });
        this.blurredTextures = [];
        this.container.destroy({ children: true, texture: true, baseTexture: true });
        this.shapes = [];
    }
}