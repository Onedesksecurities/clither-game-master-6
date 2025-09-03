import * as PIXI from 'pixi.js';

export class CashOutTimer {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private background!: PIXI.Graphics;
    private timerText!: PIXI.Text;
    private instructionText!: PIXI.Text;
    private isMobile: boolean;
    
    private readonly CONTAINER_WIDTH = 200;
    private readonly CONTAINER_HEIGHT = 80;
    private readonly CORNER_RADIUS = 10;

    constructor(app: PIXI.Application, isMobile: boolean) {
        this.app = app;
        this.isMobile = isMobile;
        this.container = new PIXI.Container();
        this.container.zIndex = 10002; 
        
        this.createTimerElements();
        this.updatePosition();
        
        this.app.stage.addChild(this.container);
        this.setupResize();
        
        this.container.visible = false;
    }

    private createTimerElements(): void {
        
        this.background = new PIXI.Graphics();
        this.drawBackground();
        this.container.addChild(this.background);
        
        this.timerText = new PIXI.Text('4', {
            fontFamily: 'Arial',
            fontSize: 32,
            fill: 0xff4444,
            align: 'center',
            fontWeight: 'bold',
            stroke: 0x000000,
            strokeThickness: 3
        });
        this.timerText.anchor.set(0.5);
        this.timerText.position.set(this.CONTAINER_WIDTH / 2, this.CONTAINER_HEIGHT / 2 - 10);
        this.container.addChild(this.timerText);
        
        const instructionMessage = this.isMobile ? 'Hold "Cash Out"' : 'Hold "Enter" to cash out';
        this.instructionText = new PIXI.Text(instructionMessage, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xffffff,
            align: 'center',
            fontWeight: 'normal'
        });
        this.instructionText.anchor.set(0.5);
        this.instructionText.position.set(this.CONTAINER_WIDTH / 2, this.CONTAINER_HEIGHT / 2 + 20);
        this.container.addChild(this.instructionText);
    }

    private drawBackground(): void {
        this.background.clear();
        
        this.background.beginFill(0x000000, 0.8);
        this.background.lineStyle(2, 0x444444, 1);
        this.background.drawRoundedRect(0, 0, this.CONTAINER_WIDTH, this.CONTAINER_HEIGHT, this.CORNER_RADIUS);
        this.background.endFill();
        
        this.background.beginFill(0xffffff, 0.1);
        this.background.drawRoundedRect(2, 2, this.CONTAINER_WIDTH - 4, this.CONTAINER_HEIGHT - 4, this.CORNER_RADIUS - 1);
        this.background.endFill();
    }

    private updatePosition(): void {
        
        this.container.position.set(
            (this.app.screen.width - this.CONTAINER_WIDTH) / 2,
            20
        );
    }

    private setupResize(): void {
        const originalResize = window.onresize;
        window.onresize = (event) => {
            if (originalResize) originalResize.call(window, event as UIEvent);
            this.updatePosition();
        };
    }

    public show(): void {
        this.container.visible = true;
        this.timerText.text = '4';
        
        this.container.alpha = 0;
        this.container.scale.set(0.8);
        
        const startTime = Date.now();
        const duration = 300;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); 
            
            this.container.alpha = eased;
            this.container.scale.set(0.8 + (0.2 * eased));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    public hide(): void {
        if (!this.container.visible) return;
        
        const startTime = Date.now();
        const duration = 200;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress * progress * progress; 
            
            this.container.alpha = 1 - eased;
            this.container.scale.set(1 - (0.2 * eased));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.container.visible = false;
            }
        };
        
        animate();
    }

    public updateTimer(remainingSeconds: number): void {
        const seconds = Math.ceil(remainingSeconds);
        this.timerText.text = seconds.toString();
        
        if (seconds <= 1) {
            this.timerText.style.fill = 0xff0000; 
        } else if (seconds <= 2) {
            this.timerText.style.fill = 0xff6600; 
        } else {
            this.timerText.style.fill = 0xff4444; 
        }
        
        if (remainingSeconds <= 1.0) {
            const pulseScale = 1 + 0.2 * Math.sin(Date.now() * 0.01);
            this.timerText.scale.set(pulseScale);
        } else {
            this.timerText.scale.set(1);
        }
    }

    public destroy(): void {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}