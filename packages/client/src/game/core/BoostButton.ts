import * as PIXI from 'pixi.js';

export class BoostButton {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private background!: PIXI.Graphics;
    private chevronGraphics!: PIXI.Graphics;
    private isPressed: boolean = false;

    private readonly BUTTON_SIZE = 60;
    private readonly BUTTON_RADIUS = this.BUTTON_SIZE / 2;
    private readonly CHEVRON_SIZE = 20;

    private readonly BACKGROUND_COLOR = 0x333333;
    private readonly BACKGROUND_PRESSED_COLOR = 0x555555;
    private readonly BORDER_COLOR = 0xFFFFFF;
    private readonly CHEVRON_COLOR = 0xffffff;

    private onBoostStart: (() => void) | null = null;
    private onBoostEnd: (() => void) | null = null;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
        this.container.zIndex = 9999; 

        this.createButton();
        this.setupInteraction();
        this.updatePosition();
        this.setupResize();

        this.checkIfMobile();

        this.app.stage.addChild(this.container);
    }

    private createButton(): void {
        
        this.background = new PIXI.Graphics();
        this.drawBackground(false);
        this.container.addChild(this.background);

        this.chevronGraphics = new PIXI.Graphics();
        this.drawChevrons();
        this.container.addChild(this.chevronGraphics);
    }

    private drawBackground(pressed: boolean): void {
        this.background.clear();

        const bgColor = pressed ? this.BACKGROUND_PRESSED_COLOR : this.BACKGROUND_COLOR;
        const scale = pressed ? 0.95 : 1.0;

        this.background.beginFill(bgColor, 0.1);
        this.background.drawCircle(0, 0, this.BUTTON_RADIUS * scale);
        this.background.endFill();

        this.background.lineStyle(1.5, this.BORDER_COLOR, 1.0);
        this.background.drawCircle(0, 0, this.BUTTON_RADIUS * scale);
        this.background.lineStyle(0);
    }

    private drawChevrons(): void {
        this.chevronGraphics.clear();

        const chevronWidth = this.CHEVRON_SIZE;
        const chevronHeight = this.CHEVRON_SIZE * 0.6;
        const spacing = 12;

        for (let i = 0; i < 3; i++) {
            const yOffset = (i - 1) * spacing; 

            this.chevronGraphics.lineStyle(5, this.CHEVRON_COLOR, (i+1)/3);
            
            this.chevronGraphics.moveTo(-chevronWidth / 2, yOffset + chevronHeight / 2);
            this.chevronGraphics.lineTo(0, yOffset - chevronHeight / 2);
            this.chevronGraphics.lineTo(chevronWidth / 2, yOffset + chevronHeight / 2);
        }
    }

    private setupInteraction(): void {
        this.container.eventMode = 'static';
        this.container.cursor = 'pointer';

        this.container.on('pointerdown', this.onPointerDown.bind(this));
        this.container.on('pointerup', this.onPointerUp.bind(this));
        this.container.on('pointerupoutside', this.onPointerUp.bind(this));

        this.container.on('pointerover', this.onPointerOver.bind(this));
        this.container.on('pointerout', this.onPointerOut.bind(this));
    }

    private onPointerDown(event: PIXI.FederatedPointerEvent): void {
        event.stopPropagation(); 

        if (!this.isPressed) {
            this.isPressed = true;
            this.drawBackground(true);
            this.animatePress();

            if (this.onBoostStart) {
                this.onBoostStart();
            }
        }
    }

    private onPointerUp(event: PIXI.FederatedPointerEvent): void {
        if (event) {
            event.stopPropagation();
        }

        if (this.isPressed) {
            this.isPressed = false;
            this.drawBackground(false);
            this.animateRelease();

            if (this.onBoostEnd) {
                this.onBoostEnd();
            }
        }
    }

    private onPointerOver(): void {
        if (!this.isPressed) {
            this.container.alpha = 0.9;
        }
    }

    private onPointerOut(): void {
        if (!this.isPressed) {
            this.container.alpha = 0.8;
        }
    }

    private animatePress(): void {
        
        this.container.scale.set(0.95);

        const animate = () => {
            const currentScale = this.container.scale.x;
            const targetScale = 0.95;
            const newScale = currentScale + (targetScale - currentScale) * 0.3;

            this.container.scale.set(newScale);

            if (Math.abs(newScale - targetScale) > 0.01) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    private animateRelease(): void {
        
        const animate = () => {
            const currentScale = this.container.scale.x;
            const targetScale = 1.0;
            const newScale = currentScale + (targetScale - currentScale) * 0.2;

            this.container.scale.set(newScale);

            if (Math.abs(newScale - targetScale) > 0.01) {
                requestAnimationFrame(animate);
            } else {
                this.container.scale.set(targetScale);
            }
        };
        animate();
    }

    private updatePosition(): void {
        
        this.container.position.set(
            this.app.screen.width / 4,
            2*this.app.screen.height / 3
        );
    }

    private setupResize(): void {
        const originalResize = window.onresize;
        window.onresize = (event) => {
            if (originalResize) originalResize.call(window, event as UIEvent);
            this.updatePosition();
        };
    }

    private checkIfMobile(): void {
        
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.setVisible(isMobile);
    }

    public setVisible(visible: boolean): void {
        this.container.visible = visible;
        this.container.alpha = visible ? 0.8 : 0;
    }

    public onBoostStarted(callback: () => void): void {
        this.onBoostStart = callback;
    }

    public onBoostEnded(callback: () => void): void {
        this.onBoostEnd = callback;
    }

    public triggerBoostStart(): void {
        if (!this.isPressed) {
            this.onPointerDown(null as any);
        }
    }

    public triggerBoostEnd(): void {
        if (this.isPressed) {
            this.onPointerUp(null as any);
        }
    }

    public isBoostActive(): boolean {
        return this.isPressed;
    }

    public forceShow(show: boolean): void {
        this.setVisible(show);
    }

    public updateBoostState(isBoosting: boolean): void {
        if (isBoosting !== this.isPressed) {
            if (isBoosting) {
                this.isPressed = true;
                this.drawBackground(true);
            } else {
                this.isPressed = false;
                this.drawBackground(false);
            }
        }
    }

    public destroy(): void {
        
        this.container.off('pointerdown');
        this.container.off('pointerup');
        this.container.off('pointerupoutside');
        this.container.off('pointerover');
        this.container.off('pointerout');

        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true, texture: true, baseTexture: true });
    }

    public getContainer(): PIXI.Container {
        return this.container;
    }
}