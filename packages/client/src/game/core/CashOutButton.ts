import * as PIXI from 'pixi.js';

export class CashOutButton {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private background!: PIXI.Graphics;
    private text!: PIXI.Text;
    private isActive: boolean = false;
    private isVisible: boolean = false;

    
    private onCashOutStartedCallback: (() => void) | null = null;
    private onCashOutEndedCallback: (() => void) | null = null;
    private onCashOutCompletedCallback: (() => void) | null = null;

    
    private readonly BUTTON_WIDTH = 120;
    private readonly BUTTON_HEIGHT = 30;
    private readonly CORNER_RADIUS = 2;
    private readonly FONT_SIZE = 14;

    
    private readonly NORMAL_COLOR = 0x2C2C2C;
    private readonly ACTIVE_COLOR = 0x1a1a1a;
    private readonly BORDER_COLOR = 0xFFFFFF;
    private readonly ACTIVE_BORDER_COLOR = 0xFFFFFF;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
        this.container.zIndex = 10001; 

        this.createButton();
        this.updatePosition();
        this.setupEventListeners();

        this.app.stage.addChild(this.container);
        this.setupResize();
    }

    private createButton(): void {
        
        this.background = new PIXI.Graphics();
        this.drawBackground(false);
        this.container.addChild(this.background);

        
        this.text = new PIXI.Text('Cash Out', {
            fontFamily: 'Roboto',
            fontSize: this.FONT_SIZE,
            fill: 0xFFFFFF,
            align: 'center',
            fontWeight: 'bold'
        });
        this.text.anchor.set(0.5);
        this.text.position.set(this.BUTTON_WIDTH / 2, this.BUTTON_HEIGHT / 2);
        this.container.addChild(this.text);

        
        this.container.visible = false;
    }

    private drawBackground(active: boolean): void {
        this.background.clear();

        const bgColor = active ? this.ACTIVE_COLOR : this.NORMAL_COLOR;
        const borderColor = active ? this.ACTIVE_BORDER_COLOR : this.BORDER_COLOR;

        
        this.background.beginFill(bgColor, 0.3);
        this.background.lineStyle(1.4, borderColor, 1);
        this.background.drawRoundedRect(0, 0, this.BUTTON_WIDTH, this.BUTTON_HEIGHT, this.CORNER_RADIUS);
        this.background.endFill();
    }

    private updatePosition(): void {
        const padding = 20;
        this.container.position.set(

            this.app.screen.width / 2 - this.BUTTON_WIDTH / 2,
            this.app.screen.height - this.BUTTON_HEIGHT / 2 - padding - 10
        );
    }

    private setupResize(): void {
        const originalResize = window.onresize;
        window.onresize = (event) => {
            if (originalResize) originalResize.call(window, event as UIEvent);
            this.updatePosition();
        };
    }

    private setupEventListeners(): void {
        this.container.eventMode = 'static';
        this.container.cursor = 'pointer';

        this.container.on('pointerdown', this.onPointerDown.bind(this));
        this.container.on('pointerup', this.onPointerUp.bind(this));
        this.container.on('pointerupoutside', this.onPointerUp.bind(this));
    }

    private onPointerDown(): void {
        if (!this.isVisible) return;

        this.isActive = true;
        this.drawBackground(true);

        if (this.onCashOutStartedCallback) {
            this.onCashOutStartedCallback();
        }
    }

    private onPointerUp(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.drawBackground(false);

        if (this.onCashOutEndedCallback) {
            this.onCashOutEndedCallback();
        }
    }

    
    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.container.visible = visible;
    }

    public isPressed(): boolean {
        return this.isActive;
    }

    public updateCashOutState(active: boolean): void {
        this.isActive = active;
        this.drawBackground(active);
    }

    
    public onCashOutStarted(callback: () => void): void {
        this.onCashOutStartedCallback = callback;
    }

    public onCashOutEnded(callback: () => void): void {
        this.onCashOutEndedCallback = callback;
    }

    public onCashOutCompleted(callback: () => void): void {
        this.onCashOutCompletedCallback = callback;
    }

    public triggerCashOutCompleted(): void {
        if (this.onCashOutCompletedCallback) {
            this.onCashOutCompletedCallback();
        }
    }

    public getContainer(): PIXI.Container {
        return this.container;
    }

    public destroy(): void {

        if (this.container) {
            this.container.off('pointerdown');
            this.container.off('pointerup');
            this.container.off('pointerupoutside');

            if (this.container.parent) {
                this.container.parent.removeChild(this.container);
            }
            this.container.destroy({ children: true });
        }
    }
}