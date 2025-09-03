import * as PIXI from 'pixi.js';
import { config } from 'shared';

interface MinimapData {
    grid: boolean[][]; 
    playerPosition?: { x: number; y: number };
}

export class Minimap {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private background!: PIXI.Graphics;
    private gridGraphics!: PIXI.Graphics;
    private playerDot!: PIXI.Graphics;
    
    private minimapSize!: number;
    private gridSize: number = 40;
    private cellSize!: number;
    private worldRadius: number;
    
    constructor(app: PIXI.Application) {
        this.app = app;
        this.worldRadius = config.WORLD_RADIUS;
        
        this.container = new PIXI.Container();
        this.container.zIndex = 10000; 
        
        this.calculateSizes();
        this.createMinimapElements();
        this.updatePosition();
        
        this.app.stage.addChild(this.container);
        
        this.setupResize();
    }
    
    private calculateSizes(): void {
        this.minimapSize = Math.min(this.app.screen.width, this.app.screen.height) * 0.2;
        this.cellSize = (this.minimapSize * 0.9) / this.gridSize; 
    }
    
    private createMinimapElements(): void {
        
        this.background = new PIXI.Graphics();
        
        const radius = this.minimapSize / 2;
        const color1 = 0xFFFFFF; 

        this.background.beginFill(color1, 0.05);
        this.background.moveTo(0, 0);
        this.background.arc(0, 0, radius, -Math.PI / 2, 0);
        this.background.closePath();
        this.background.endFill();

        this.background.beginFill(color1, 0.1);
        this.background.moveTo(0, 0);
        this.background.arc(0, 0, radius, 0, Math.PI / 2);
        this.background.closePath();
        this.background.endFill();

        this.background.beginFill(color1, 0.05);
        this.background.moveTo(0, 0);
        this.background.arc(0, 0, radius, Math.PI / 2, Math.PI);
        this.background.closePath();
        this.background.endFill();

        this.background.beginFill(color1, 0.1);
        this.background.moveTo(0, 0);
        this.background.arc(0, 0, radius, Math.PI, 1.5 * Math.PI);
        this.background.closePath();
        this.background.endFill();
        
        this.container.addChild(this.background);
        
        this.gridGraphics = new PIXI.Graphics();
        this.container.addChild(this.gridGraphics);
        
        this.playerDot = new PIXI.Graphics();
        this.container.addChild(this.playerDot);
    }
    
    private updatePosition(): void {
        const padding = 5;
        this.container.position.set(
            padding + this.minimapSize / 2, 
            padding+15 + this.minimapSize / 2
        );
    }
    
    private setupResize(): void {
        
        const onResize = () => {
            this.calculateSizes();
            this.recreateMinimapElements();
            this.updatePosition();
        };

        window.addEventListener('resize', onResize);

        this.destroyResize = () => window.removeEventListener('resize', onResize);
    }

    private destroyResize: () => void = () => {};

    private recreateMinimapElements(): void {
        
        while(this.container.children.length > 0){
            this.container.removeChildAt(0).destroy({ children: true });
        }
        
        this.createMinimapElements();
    }
    
    public updateMinimap(data: MinimapData): void {
        this.gridGraphics.clear();
        
        const halfGrid = this.gridSize / 2;
        const minimapRadius = this.minimapSize / 2;
        
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                if (data.grid[x] && data.grid[x][y]) {
                    
                    const minimapX = ((x - halfGrid) / halfGrid) * (minimapRadius * 0.9);
                    const minimapY = ((y - halfGrid) / halfGrid) * (minimapRadius * 0.9);
                    
                    const distanceFromCenter = Math.sqrt(minimapX * minimapX + minimapY * minimapY);
                    if (distanceFromCenter <= minimapRadius * 0.9) {
                        this.gridGraphics.beginFill(0xffffff, 0.6); 

                        this.gridGraphics.drawRect(
                            minimapX - this.cellSize / 2, 
                            minimapY - this.cellSize / 2, 
                            this.cellSize, 
                            this.cellSize
                        );
                        
                        this.gridGraphics.endFill();
                    }
                }
            }
        }
        
        if (data.playerPosition) {
            this.updatePlayerPosition(data.playerPosition);
        }
    }
    
    private updatePlayerPosition(worldPos: { x: number; y: number }): void {
        this.playerDot.clear();
        
        const minimapRadius = this.minimapSize / 2;
        const normalizedX = worldPos.x / this.worldRadius;
        const normalizedY = worldPos.y / this.worldRadius;
        
        const minimapX = normalizedX * (minimapRadius * 0.9);
        const minimapY = normalizedY * (minimapRadius * 0.9);
        
        const distanceFromCenter = Math.sqrt(minimapX * minimapX + minimapY * minimapY);
        if (distanceFromCenter <= minimapRadius * 0.9) {
            
            this.playerDot.beginFill(0xff4444, 1.0); 

            const playerDotSize = this.cellSize; 
            this.playerDot.drawRect(
                minimapX - playerDotSize / 2, 
                minimapY - playerDotSize / 2, 
                playerDotSize, 
                playerDotSize
            );
            
            this.playerDot.endFill();
        }
    }
    
    public destroy(): void {
        
        this.destroyResize();

        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true, texture: true, baseTexture: true });
    }
    
    public getContainer(): PIXI.Container {
        return this.container;
    }
}
