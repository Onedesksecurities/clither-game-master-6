import * as PIXI from 'pixi.js';

export class Camera {
    private app: PIXI.Application;
    private worldContainer: PIXI.Container;
    public view: PIXI.Rectangle = new PIXI.Rectangle();

    constructor(app: PIXI.Application) {
        this.app = app;
        this.worldContainer = new PIXI.Container();
        this.app.stage.addChild(this.worldContainer);
    }

    public update(targetX: number, targetY: number, currentZoom: number): void {
        
        if (Math.abs(currentZoom) < 0.0001) {
            currentZoom = 0.0001;
        }
        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;

        this.worldContainer.pivot.set(targetX, targetY);
        this.worldContainer.position.set(screenWidth / 2, screenHeight / 2);
        this.worldContainer.scale.set(currentZoom);

        const viewX = targetX - (screenWidth / 2) / currentZoom;
        const viewY = targetY - (screenHeight / 2) / currentZoom;
        const viewWidth = screenWidth / currentZoom;
        const viewHeight = screenHeight / currentZoom;
        
        this.view.x = viewX;
        this.view.y = viewY;
        this.view.width = viewWidth;
        this.view.height = viewHeight;
    }

    public getWorldContainer(): PIXI.Container {
        return this.worldContainer;
    }

    public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        const worldPoint = new PIXI.Point(screenX, screenY);
        const worldPos = this.worldContainer.toLocal(worldPoint);
        return { x: worldPos.x, y: worldPos.y };
    }
}