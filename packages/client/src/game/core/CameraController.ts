import { Camera } from '../Camera';
import { SnakeV2 as Snake } from '../snake/SnakeV2';
import { config } from 'shared';

const { camera: cameraConfig } = config;
const { ZOOM_BASE, ZOOM_FACTOR, ZOOM_POWER, ZOOM_SPEED } = cameraConfig;

export class CameraController {
    private camera: Camera;
    private currentZoom: number = 1.0;
    private targetZoom: number = 1.0;

    constructor(camera: Camera) {
        this.camera = camera;
    }

    public update(focusSnake: Snake | null, deathPosition: { x: number, y: number } | null, isGameOver: boolean): void {
        try {
            const focusPoint = (isGameOver && deathPosition) ?
                deathPosition :
                (focusSnake ? focusSnake.getHeadPosition() : { x: 0, y: 0 });




            const snakeLength = focusSnake ? focusSnake.getLength() : config.snake.INITIAL_SEGMENT_COUNT;

            if (focusSnake?.isSpectator) {

                this.camera.update(focusPoint.x, focusPoint.y, 0.6);

            } else {
                const lengthFactor = Math.max(0, snakeLength - 10);


                this.targetZoom = ZOOM_BASE / (1 + Math.pow(lengthFactor, ZOOM_POWER) * ZOOM_FACTOR);
                this.currentZoom += (this.targetZoom - this.currentZoom) * ZOOM_SPEED;


                this.camera.update(focusPoint.x, focusPoint.y, this.currentZoom);
            }
        } catch (error) {
            console.error("Error updating camera:", error);
            this.camera.update(0, 0, 1);
        }
    }

    public getCurrentZoom(): number {
        return this.currentZoom;
    }
}