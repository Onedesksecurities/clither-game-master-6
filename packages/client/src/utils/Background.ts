import * as PIXI from 'pixi.js';

import { config } from 'shared';

const { TILE_RADIUS, TILE_CORNER_RADIUS, TILE_SPACING_FACTOR } = config.graphics.background;

function createHexagonTileTexture(radius: number, cornerRadius: number, fillColorCenter: number, fillColorEdge: number, highlightColor: number): PIXI.Texture {
    const hexColorCenter = new PIXI.Color(fillColorCenter);
    const hexColorEdge = new PIXI.Color(fillColorEdge);
    const glowColor = new PIXI.Color(highlightColor);

    const blurPadding = 3;
    const canvasSize = (radius + blurPadding) * 2;
    const center = canvasSize / 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const context = canvas.getContext('2d')!;

    context.shadowColor = glowColor.toRgbaString();
    context.shadowBlur = 8;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    const gradient = context.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, hexColorCenter.toRgbaString() );
    gradient.addColorStop(0.9, hexColorCenter.toRgbaString()); 
    gradient.addColorStop(1, hexColorEdge.toRgbaString());
    context.fillStyle = gradient;

    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        points.push(new PIXI.Point(center + radius * Math.cos(angle), center + radius * Math.sin(angle)));
    }

    context.beginPath();
    const startPointX = points[0].x - (points[0].x - points[5].x) * cornerRadius / radius;
    const startPointY = points[0].y - (points[0].y - points[5].y) * cornerRadius / radius;
    context.moveTo(startPointX, startPointY);

    for (let i = 0; i < 6; i++) {
        const currentPoint = points[i];
        const nextPoint = points[(i + 1) % 6];
        const nextSegmentPointX = nextPoint.x - (nextPoint.x - currentPoint.x) * cornerRadius / radius;
        const nextSegmentPointY = nextPoint.y - (nextPoint.y - currentPoint.y) * cornerRadius / radius;
        context.quadraticCurveTo(currentPoint.x, currentPoint.y, nextSegmentPointX, nextSegmentPointY);
    }
    context.closePath();
    context.fill();

    return PIXI.Texture.from(canvas);
}

export function createTiledBackground(renderer: PIXI.Renderer, worldWidth: number, worldHeight: number): PIXI.Container {
    const maxTextureSize = renderer.gl.getParameter(renderer.gl.MAX_TEXTURE_SIZE);
    const chunkSize = Math.min(maxTextureSize, 2048);

    const backgroundContainer = new PIXI.Container();
    const tileTexture = createHexagonTileTexture(TILE_RADIUS, TILE_CORNER_RADIUS, 0x14202C, 0x21364b, 0x000000);

    const masterTilingContainer = new PIXI.Container();
    const hexWidth = TILE_RADIUS * 2;
    const hexHeight = Math.sqrt(3) * TILE_RADIUS;
    const axis1 = new PIXI.Point(hexWidth * 3/4 * TILE_SPACING_FACTOR, hexHeight / 2 * TILE_SPACING_FACTOR);
    const axis2 = new PIXI.Point(hexWidth * 3/4 * TILE_SPACING_FACTOR, -hexHeight / 2 * TILE_SPACING_FACTOR);
    
    const coverageWidth = worldWidth + 1000;
    const coverageHeight = worldHeight + 1000;
    const tilesX = Math.ceil(coverageWidth / axis1.x);
    const tilesY = Math.ceil(coverageHeight / axis1.y);
    const numTilesToDraw = Math.max(tilesX, tilesY);

    for (let u = -numTilesToDraw / 2; u < numTilesToDraw / 2; u++) {
        for (let v = -numTilesToDraw / 2; v < numTilesToDraw / 2; v++) {
            const x = u * axis1.x + v * axis2.x;
            const y = u * axis1.y + v * axis2.y;
            const tile = new PIXI.Sprite(tileTexture);
            tile.anchor.set(0.5);
            tile.position.set(x, y);
            masterTilingContainer.addChild(tile);
        }
    }
    const numChunksX = Math.ceil(worldWidth / chunkSize) + 1; 
    const numChunksY = Math.ceil(worldHeight / chunkSize) + 1;

    for (let j = 0; j < numChunksY; j++) {
        for (let i = 0; i < numChunksX; i++) {
            const chunkRenderTexture = PIXI.RenderTexture.create({ width: chunkSize, height: chunkSize });
            
            const chunkWorldX = (i * chunkSize) - (worldWidth / 2) - (chunkSize / 2);
            const chunkWorldY = (j * chunkSize) - (worldHeight / 2) - (chunkSize / 2);

            masterTilingContainer.position.set(-chunkWorldX, -chunkWorldY);

            renderer.render(masterTilingContainer, { renderTexture: chunkRenderTexture, clear: true });

            const chunkSprite = new PIXI.Sprite(chunkRenderTexture);
            chunkSprite.position.set(chunkWorldX, chunkWorldY);
            backgroundContainer.addChild(chunkSprite);
        }
    }
    
    return backgroundContainer;
}
