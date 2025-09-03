
import * as PIXI from 'pixi.js';

export function createWorldBoundary(worldRadius: number): PIXI.Graphics {
    const boundary = new PIXI.Graphics();
    
    const overlaySize = worldRadius * 4; 
    
    boundary.beginFill(0x6E0202, 0.4); 
    boundary.drawRect(-overlaySize / 2, -overlaySize / 2, overlaySize, overlaySize);
    boundary.endFill();
    boundary.beginHole();
    boundary.drawCircle(0, 0, worldRadius);
    boundary.endHole();
    boundary.lineStyle(15, 0x6E0202, 1.0); 
    boundary.drawCircle(0, 0, worldRadius);
    
    return boundary;
}