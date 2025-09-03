import * as PIXI from 'pixi.js';
import { ControlMode } from '../../SettingsManager';
import { SnakeV2 as Snake } from '../snake/SnakeV2';
import { config } from 'shared';

const { ui } = config;
const { JOYSTICK_SCREEN_PADDING } = ui;

import { BoostButton } from './BoostButton';
import { CashOutManager } from './CashOutManager';

export class InputManager {
    private app: PIXI.Application;
    private joystickActive: boolean = false;
    private joystickBase = new PIXI.Point();
    private pointerPosition = new PIXI.Point();
    private joystickPointerDistance: number = 0;
    private boostInputActive: boolean = false;
    private playerSnake: Snake | null = null;

    private boostButton: BoostButton;
    private cashOutManager: CashOutManager;
    private isMobile: boolean;

    constructor(app: PIXI.Application, worldContainer: PIXI.Container) {
        this.app = app;

        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        this.boostButton = new BoostButton(app);
        this.setupBoostButtonCallbacks();

        this.cashOutManager = new CashOutManager(app, worldContainer);
    }

    private setupBoostButtonCallbacks(): void {
        this.boostButton.onBoostStarted(() => {
            this.boostInputActive = true;
        });

        this.boostButton.onBoostEnded(() => {
            this.boostInputActive = false;
        });
    }

    public setup(controlMode: ControlMode, playerSnake: Snake): void {
        this.playerSnake = playerSnake;
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen;

        this.setupKeyboardInput();
        this.setupPointerInput(controlMode);

        this.boostButton.setVisible(this.isMobile);

        this.cashOutManager.setPlayerSnake(playerSnake);
        this.cashOutManager.setVisible(true);
    }

    private setupKeyboardInput(): void {
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                event.preventDefault();
                this.boostInputActive = true;
                this.boostButton.updateBoostState(true);
            }
            
        });

        document.addEventListener('keyup', (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                this.boostInputActive = false;
                this.boostButton.updateBoostState(false);
            }
            
        });
    }

    private setupPointerInput(controlMode: ControlMode): void {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        let lastTapTime = 0;
        const DOUBLE_TAP_THRESHOLD = 300;

        if (controlMode === 'joystick') {
            this.setupJoystickControls(lastTapTime, DOUBLE_TAP_THRESHOLD);
        } else {
            this.setupMouseControls(isMobile, lastTapTime, DOUBLE_TAP_THRESHOLD);
        }
    }

    private setupJoystickControls(lastTapTime: number, DOUBLE_TAP_THRESHOLD: number): void {
        this.app.stage.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
            if (!this.playerSnake) return;

            const boostButtonBounds = this.boostButton.getContainer().getBounds();
            if (boostButtonBounds.contains(event.global.x, event.global.y)) {
                return; 
            }

            if (this.isMobile) {
                const cashOutButtonBounds = this.cashOutManager.getCashOutButton()?.getContainer().getBounds();
                if (cashOutButtonBounds && cashOutButtonBounds.contains(event.global.x, event.global.y)) {
                    return; 
                }
            }

            const now = Date.now();
            if (now - lastTapTime < DOUBLE_TAP_THRESHOLD) {
                this.boostInputActive = true;
            }
            lastTapTime = now;
            this.joystickActive = true;
            this.pointerPosition.copyFrom(event.global);
            const safeArea = JOYSTICK_SCREEN_PADDING;
            this.joystickBase.x = Math.max(safeArea, Math.min(event.global.x, this.app.screen.width - safeArea));
            this.joystickBase.y = Math.max(safeArea, Math.min(event.global.y, this.app.screen.height - safeArea));
            this.playerSnake.setHeadingArrowVisible(true);
        });

        this.app.stage.on('pointermove', (event: PIXI.FederatedPointerEvent) => {
            if (!this.playerSnake || !this.joystickActive) return;
            this.pointerPosition.copyFrom(event.global);
            const dx = event.global.x - this.joystickBase.x;
            const dy = event.global.y - this.joystickBase.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.joystickPointerDistance = dist;
            if (dist > 0) {
                const angle = Math.atan2(dy, dx);
                this.playerSnake.setTargetAngle(angle);
            }
        });

        const onPointerUp = () => {
            if (!this.playerSnake) return;
            if (!this.boostButton.isBoostActive()) {
                this.boostInputActive = false;
                this.boostButton.updateBoostState(false);
            }
            this.boostInputActive = false;
            this.joystickActive = false;
            this.playerSnake.setHeadingArrowVisible(false);
            this.joystickPointerDistance = 0;
        };

        this.app.stage.on('pointerup', onPointerUp);
        this.app.stage.on('pointerupoutside', onPointerUp);
    }

    private setupMouseControls(isMobile: boolean, lastTapTime: number, DOUBLE_TAP_THRESHOLD: number): void {
        this.app.stage.on('pointermove', (event: PIXI.FederatedPointerEvent) => {
            if (!this.playerSnake) return;
            const screenCenterX = this.app.screen.width / 2;
            const screenCenterY = this.app.screen.height / 2;
            this.playerSnake.setTargetAngle(Math.atan2(event.global.y - screenCenterY, event.global.x - screenCenterX));
        });

        if (isMobile) {
            this.app.stage.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
                
                const boostButtonBounds = this.boostButton.getContainer().getBounds();
                if (boostButtonBounds.contains(event.global.x, event.global.y)) {
                    return; 
                }

                const cashOutButtonBounds = this.cashOutManager.getCashOutButton()?.getContainer().getBounds();
                if (cashOutButtonBounds && cashOutButtonBounds.contains(event.global.x, event.global.y)) {
                    return; 
                }

                const now = Date.now();
                if (now - lastTapTime < DOUBLE_TAP_THRESHOLD) {
                    this.boostInputActive = true;
                    this.boostButton.updateBoostState(true);
                }
                lastTapTime = now;
            });
            const onPointerUp = () => { this.boostInputActive = false; };
            this.app.stage.on('pointerup', onPointerUp);
            this.app.stage.on('pointerupoutside', onPointerUp);
        } else {
            this.app.stage.on('pointerdown', () => { this.boostInputActive = true; });
            const onPointerUp = () => { this.boostInputActive = false; };
            this.app.stage.on('pointerup', onPointerUp);
            this.app.stage.on('pointerupoutside', onPointerUp);
        }
    }

    public update(): void {
        this.cashOutManager.update();
    }

    public setBoostButtonVisible(visible: boolean): void {
        this.boostButton.forceShow(visible);
    }

    public getBoostButton(): BoostButton {
        return this.boostButton;
    }

    public getCashOutManager(): CashOutManager {
        return this.cashOutManager;
    }

    public isBoostActive(): boolean {
        return this.boostInputActive;
    }

    public getJoystickDistance(): number {
        return this.joystickPointerDistance;
    }

    public destroy(): void {
        if (this.boostButton) {
            this.boostButton.destroy();
        }

        if (this.cashOutManager) {
            this.cashOutManager.destroy();
        }

        if (this.app.stage) {
            this.app.stage.off('pointerdown');
            this.app.stage.off('pointermove');
            this.app.stage.off('pointerup');
            this.app.stage.off('pointerupoutside');
        }
    }
}