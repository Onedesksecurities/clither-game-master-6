import * as PIXI from 'pixi.js';
import { config } from 'shared';

const { textures: textureConfig } = config.graphics;

export function darkenColor(color: number, percent: number): number {
    const f = (color >> 16) & 0xFF, r = (color >> 8) & 0xFF, b = color & 0xFF;
    const t = percent < 0 ? 0 : 255;
    const p = percent < 0 ? percent * -1 : percent;
    const R = Math.round((t - f) * p) + f;
    const G = Math.round((t - r) * p) + r;
    const B = Math.round((t - b) * p) + b;
    return (R << 16) | (G << 8) | B;
}


export function saturateColorHSV(hex: number, factor: number): number {

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

export class GraphicsUtils {
    private static textureCache: Map<string, PIXI.Texture> = new Map();
    private static grayscaleSegmentTextures: PIXI.Texture[] = [];
    private static foodTextureCache: Map<string, PIXI.Texture | PIXI.Texture[]> = new Map();

    public static clearCache(): void {
        this.textureCache.clear();
        this.grayscaleSegmentTextures = [];
        this.foodTextureCache.clear();
    }

    public static createBlurredShapeTexture(renderer: PIXI.Renderer, cacheKey: string): PIXI.Texture {
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        const size = 300;
        const shapeRadius = size * 0.3;
        const center = size / 2;

        const sourceGraphics = new PIXI.Graphics();

        const numPoints = 5 + Math.floor(Math.random() * 3);
        const points: PIXI.Point[] = [];
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const randomRadius = shapeRadius * (0.9 + Math.random() * 0.2);
            points.push(new PIXI.Point(
                center + Math.cos(angle) * randomRadius,
                center + Math.sin(angle) * randomRadius,
            ));
        }

        const midPoints = points.map((p, i) => {
            const p2 = points[(i + 1) % numPoints];
            return new PIXI.Point((p.x + p2.x) / 2, (p.y + p2.y) / 2);
        });

        sourceGraphics.beginFill(0xFFFFFF);
        sourceGraphics.moveTo(midPoints[0].x, midPoints[0].y);
        for (let i = 0; i < midPoints.length; i++) {
            const nextMidPoint = midPoints[(i + 1) % numPoints];
            const controlPoint = points[(i + 1) % numPoints];
            sourceGraphics.quadraticCurveTo(controlPoint.x, controlPoint.y, nextMidPoint.x, nextMidPoint.y);
        }
        sourceGraphics.endFill();

        const blurFilter = new PIXI.BlurFilter();
        blurFilter.blur = 18;
        blurFilter.quality = 6;
        sourceGraphics.filters = [blurFilter];

        const bounds = sourceGraphics.getBounds();
        const renderTexture = PIXI.RenderTexture.create({
            width: bounds.width,
            height: bounds.height,
            resolution: renderer.resolution,
        });

        sourceGraphics.position.set(-bounds.x, -bounds.y);

        renderer.render(sourceGraphics, { renderTexture });

        this.textureCache.set(cacheKey, renderTexture);

        sourceGraphics.destroy(true);

        return renderTexture;
    }

    static createSnakeBodyTexture(color: number, radius: number): PIXI.Texture {
        const cacheKey = `snake_body_${color}_${radius}`;
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        const segmentConfig = textureConfig.segment;
        const diameter = radius * 2;
        const canvas = document.createElement('canvas');

        canvas.width = 32;
        canvas.height = diameter;
        const context = canvas.getContext('2d')!;

        const centerColorHex = color;
        const edgeColorHex = darkenColor(centerColorHex, segmentConfig.edgeColorDarkenFactor);

        const centerColor = `#${centerColorHex.toString(16).padStart(6, '0')}`;
        const edgeColor = `#${edgeColorHex.toString(16).padStart(6, '0')}`;

        const gradient = context.createLinearGradient(0, 0, 0, diameter);
        gradient.addColorStop(0, edgeColor);
        gradient.addColorStop(0.5, centerColor);
        gradient.addColorStop(1, edgeColor);

        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, diameter);

        context.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 10; i++) {
            context.fillRect(Math.random() * 32, Math.random() * diameter, 2, 2);
        }

        const texture = PIXI.Texture.from(canvas, {
            scaleMode: PIXI.SCALE_MODES.LINEAR,
        });

        this.textureCache.set(cacheKey, texture);
        return texture;
    }

    static getGrayscaleSegmentTextures(brightnessPattern: number[], radius: number, renderer: PIXI.Renderer): PIXI.Texture[] {
        if (this.grayscaleSegmentTextures.length > 0) {
            return this.grayscaleSegmentTextures;
        }

        for (let i = 0; i < brightnessPattern.length; i++) {
            const brightness = brightnessPattern[i];
            const cacheKey = `segment_${radius}_${brightness}_grayscale_v2`;
            const texture = this.getOrCreateTexture(cacheKey, (resolution) => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                const diameter = radius * 2 * resolution;
                canvas.width = diameter;
                canvas.height = diameter;
                context.scale(resolution, resolution);

                const centerColorValue = Math.round(255 * brightness);
                const edgeColorValue = Math.round(centerColorValue * textureConfig.segment.grayscaleEdgeColorMultiplier);
                const centerColor = `rgb(${centerColorValue},${centerColorValue},${centerColorValue})`;
                const edgeColor = `rgb(${edgeColorValue},${edgeColorValue},${edgeColorValue})`;

                const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
                gradient.addColorStop(0, edgeColor);
                gradient.addColorStop(0.5, centerColor);
                gradient.addColorStop(1, centerColor);

                context.fillStyle = gradient;
                context.arc(radius, radius, radius, 0, Math.PI * 2);
                context.fill();
                return canvas;
            }, renderer);
            this.grayscaleSegmentTextures.push(texture);
        }

        return this.grayscaleSegmentTextures;
    }

    static createHeadingArrowTexture(renderer: PIXI.Renderer, color: number): PIXI.Texture {
        const cacheKey = `heading_arrow_stroked__${color}`;
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }
        const graphics = new PIXI.Graphics();
        const arrowConfig = textureConfig.headingArrow;

        graphics.lineStyle(
            arrowConfig.lineWidth,
            arrowConfig.lineColor,
            arrowConfig.lineAlpha,
            arrowConfig.lineAlignment
        );
        graphics.beginFill(color);

        graphics.moveTo(arrowConfig.points[0].x, arrowConfig.points[0].y);
        for (let i = 1; i < arrowConfig.points.length; i++) {
            graphics.lineTo(arrowConfig.points[i].x, arrowConfig.points[i].y);
        }
        graphics.closePath();
        graphics.endFill();

        const texture = renderer.generateTexture(graphics, {
            scaleMode: PIXI.SCALE_MODES.LINEAR,
            resolution: arrowConfig.resolution
        });
        this.textureCache.set(cacheKey, texture);
        return texture;
    }

    static createColoredFoodTexture(color: number): PIXI.Texture {
        const cacheKey = `colored_food_with_glow_${color}`;
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        const foodConfig = textureConfig.food;
        const radius = foodConfig.radius;
        const glowPower = foodConfig.glowPower * 4;
        const paddedRadius = radius + glowPower;
        const diameter = paddedRadius * 2;
        const center = paddedRadius;

        const canvas = document.createElement('canvas');
        canvas.width = diameter;
        canvas.height = diameter;
        const context = canvas.getContext('2d')!;

        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;

        const glowGradient = context.createRadialGradient(
            center, center, radius * 0.8,
            center, center, paddedRadius
        );
        glowGradient.addColorStop(0, `rgba(${r},${g},${b},0.2)`);
        glowGradient.addColorStop(0.5, `rgba(${r},${g},${b},0.06)`);
        glowGradient.addColorStop(0.8, `rgba(${r},${g},${b},0.02)`);
        glowGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

        context.fillStyle = glowGradient;
        context.fillRect(0, 0, diameter, diameter);

        context.beginPath();
        context.arc(center, center, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${r},${g},${b},0.5)`;
        context.fill();


        const texture = PIXI.Texture.from(canvas);
        this.textureCache.set(cacheKey, texture);
        return texture;
    }

    static createFoodTexture(): PIXI.Texture {
        const cacheKey = `reusable_orb_with_glow_v3`;
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        const foodConfig = textureConfig.food;
        const radius = foodConfig.radius;
        const glowPower = foodConfig.glowPower;
        const paddedRadius = radius + glowPower;
        const diameter = paddedRadius * 2;
        const center = paddedRadius;

        const canvas = document.createElement('canvas');
        canvas.width = diameter;
        canvas.height = diameter;
        const context = canvas.getContext('2d')!;

        const glowGradient = context.createRadialGradient(
            center, center, radius,
            center, center, paddedRadius
        );
        glowGradient.addColorStop(0, foodConfig.glowGradient.start);
        glowGradient.addColorStop(1, foodConfig.glowGradient.end);

        context.fillStyle = glowGradient;
        context.fillRect(0, 0, diameter, diameter);

        context.globalCompositeOperation = 'destination-out';
        context.beginPath();
        context.arc(center, center, radius, 0, Math.PI * 2);
        context.fillStyle = 'black';
        context.fill();

        context.globalCompositeOperation = 'source-over';
        context.beginPath();
        context.arc(center, center, radius, 0, Math.PI * 2);
        context.fillStyle = foodConfig.fill;
        context.fill();

        const texture = PIXI.Texture.from(canvas);
        this.textureCache.set(cacheKey, texture);
        return texture;
    }

    static createGlowTexture(): PIXI.Texture {
        const cacheKey = `reusable_white_glow_v4`;
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        const glowConfig = textureConfig.glow;
        const radius = glowConfig.radius;
        const diameter = radius * 2;
        const canvas = document.createElement('canvas');
        canvas.width = diameter;
        canvas.height = diameter;
        const context = canvas.getContext('2d')!;

        const gradient = context.createRadialGradient(
            radius, radius, 0,
            radius, radius, radius
        );
        gradient.addColorStop(0, glowConfig.gradient.start);
        gradient.addColorStop(0.5, glowConfig.gradient.mid);
        gradient.addColorStop(1, glowConfig.gradient.end);

        context.fillStyle = gradient;
        context.arc(radius, radius, radius, 0, Math.PI * 2);
        context.fill();

        const texture = PIXI.Texture.from(canvas);
        this.textureCache.set(cacheKey, texture);
        return texture;
    }

    private static getOrCreateTexture(cacheKey: string, creationFunction: (resolution: number) => HTMLCanvasElement, renderer: PIXI.Renderer): PIXI.Texture {
        const resolution = renderer.resolution;
        const finalCacheKey = `${cacheKey}_${resolution}`;

        if (this.textureCache.has(finalCacheKey)) {
            return this.textureCache.get(finalCacheKey)!;
        }

        const canvas = creationFunction(resolution);

        const texture = PIXI.Texture.from(canvas, {
            resolution: resolution,
            scaleMode: PIXI.SCALE_MODES.LINEAR
        });

        this.textureCache.set(finalCacheKey, texture);
        return texture;
    }

    static createSegmentTexture(radius: number, color: number, brightness: number, renderer: PIXI.Renderer): PIXI.Texture {
        const cacheKey = `segment_${radius}_${color}_${brightness}`;
        return this.getOrCreateTexture(cacheKey, (resolution) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;

            const diameter = radius * 2 * resolution;
            canvas.width = diameter;
            canvas.height = diameter;

            context.scale(resolution, resolution);

            const centerColorHex = darkenColor(color, (1 - brightness) * -1);
            const edgeColorHex = darkenColor(centerColorHex, textureConfig.segment.edgeColorDarkenFactor);
            const centerColor = `#${centerColorHex.toString(16).padStart(6, '0')}`;
            const edgeColor = `#${edgeColorHex.toString(16).padStart(6, '0')}`;

            const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
            gradient.addColorStop(0, centerColor);
            gradient.addColorStop(1, edgeColor);

            context.fillStyle = gradient;
            context.arc(radius, radius, radius, 0, Math.PI * 2);
            context.fill();

            return canvas;
        }, renderer);
    }

    static createShadowTexture(radius: number, renderer: PIXI.Renderer): PIXI.Texture {
        const cacheKey = `shadow_${radius}`;
        return this.getOrCreateTexture(cacheKey, (resolution) => {
            const shadowConfig = textureConfig.shadow;
            const shadowRadius = radius * shadowConfig.radiusMultiplier;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            const diameter = shadowRadius * 2 * resolution;
            canvas.width = diameter;
            canvas.height = diameter;
            context.scale(resolution, resolution);

            const gradient = context.createRadialGradient(shadowRadius, shadowRadius, 0, shadowRadius, shadowRadius, shadowRadius);
            gradient.addColorStop(0.1, shadowConfig.gradient.start);
            gradient.addColorStop(1, shadowConfig.gradient.end);

            context.fillStyle = gradient;
            context.beginPath();
            context.arc(shadowRadius, shadowRadius, shadowRadius, 0, Math.PI * 2);
            context.fill();

            return canvas;
        }, renderer);
    }

    static createStreakHighlightTexture(radius: number, renderer: PIXI.Renderer): PIXI.Texture {
        const cacheKey = `streak_${radius}`;
        return this.getOrCreateTexture(cacheKey, (resolution) => {
            const highlightConfig = textureConfig.highlight;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            const diameter = radius * 2 * resolution;
            canvas.width = diameter;
            canvas.height = diameter;
            context.scale(resolution, resolution);

            const gradient = context.createLinearGradient(0, 0, 0, radius * 2);
            gradient.addColorStop(0, highlightConfig.gradient.edge);
            gradient.addColorStop(0.2, highlightConfig.gradient.edge);
            gradient.addColorStop(0.5, highlightConfig.gradient.mid);
            gradient.addColorStop(0.8, highlightConfig.gradient.edge);
            gradient.addColorStop(1, highlightConfig.gradient.edge);

            context.fillStyle = gradient;
            context.beginPath();
            context.arc(radius, radius, radius, 0, Math.PI * 2);
            context.fill();

            return canvas;
        }, renderer);
    }

    static createSnakeHead(radius: number): { container: PIXI.Container, leftPupil: PIXI.Graphics, rightPupil: PIXI.Graphics } {
        const headConfig = textureConfig.snakeHead;
        const container = new PIXI.Container();
        const eyeRadius = radius * headConfig.eyeRadiusFactor;
        const eyeDist = radius * headConfig.eyeDistFactor;

        const leftEye = new PIXI.Graphics();
        leftEye.beginFill(headConfig.eyeColor).drawCircle(0, 0, eyeRadius).endFill();
        leftEye.position.set(eyeDist, -eyeDist);
        const leftPupil = new PIXI.Graphics();
        leftPupil.beginFill(headConfig.pupilColor).drawCircle(0, 0, eyeRadius * headConfig.pupilRadiusFactor).endFill();
        leftEye.addChild(leftPupil);

        const rightEye = new PIXI.Graphics();
        rightEye.beginFill(headConfig.eyeColor).drawCircle(0, 0, eyeRadius).endFill();
        rightEye.position.set(eyeDist, eyeDist);
        const rightPupil = new PIXI.Graphics();
        rightPupil.beginFill(headConfig.pupilColor).drawCircle(0, 0, eyeRadius * headConfig.pupilRadiusFactor).endFill();
        rightEye.addChild(rightPupil);

        container.addChild(leftEye, rightEye);
        return { container, leftPupil, rightPupil };
    }

    static generateSnakeColor(): number {
        const colors = textureConfig.snakeColors;
        return colors[Math.floor(Math.random() * colors.length)];
    }

    static createDeathFoodTexture(color: number): PIXI.Texture {
        const cacheKey = `death_food_as_colored_food_${color}`;
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        const foodConfig = textureConfig.deathFood;
        const radius = foodConfig.radius;
        const glowPower = foodConfig.glowPower * 4;
        const paddedRadius = radius + glowPower;
        const diameter = paddedRadius * 2;
        const center = paddedRadius;

        const canvas = document.createElement('canvas');
        canvas.width = diameter;
        canvas.height = diameter;
        const context = canvas.getContext('2d')!;

        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;

        const glowGradient = context.createRadialGradient(
            center, center, radius * 0.8,
            center, center, paddedRadius
        );
        glowGradient.addColorStop(0, `rgba(${r},${g},${b},0.05)`);
        glowGradient.addColorStop(0.5, `rgba(${r},${g},${b},0.015)`);
        glowGradient.addColorStop(0.8, `rgba(${r},${g},${b},0.005)`);
        glowGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

        context.fillStyle = glowGradient;
        context.fillRect(0, 0, diameter, diameter);

        context.beginPath();
        context.arc(center, center, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${r},${g},${b},0.35)`;
        context.fill();

        const texture = PIXI.Texture.from(canvas);
        this.textureCache.set(cacheKey, texture);
        return texture;
    }
}
