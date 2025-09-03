import * as PIXI from 'pixi.js';

export function createGrid(worldWidth: number, worldHeight: number, gridSize: number): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    graphics.lineStyle(1, 0x888888, 0.2);

    for (let x = -worldWidth; x <= worldWidth; x += gridSize) {
        graphics.moveTo(x, -worldHeight);
        graphics.lineTo(x, worldHeight);
    }

    for (let y = -worldHeight; y <= worldHeight; y += gridSize) {
        graphics.moveTo(-worldWidth, y);
        graphics.lineTo(worldWidth, y);
    }

    return graphics;
}