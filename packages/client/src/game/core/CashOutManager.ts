import * as PIXI from 'pixi.js';
import { CashOutButton } from './CashOutButton';
import { CashOutTimer } from './CashOutTimer';
import { CashOutProgressRing } from './CashOutProgressRing';
import { SnakeV2 as Snake } from '../snake/SnakeV2';

export class CashOutManager {
    private app: PIXI.Application;
    private cashOutButton: CashOutButton | null = null;
    private cashOutInstructionText: PIXI.Text | null = null;
    private cashOutTimer!: CashOutTimer;
    private progressRing!: CashOutProgressRing;
    private worldContainer: PIXI.Container;
    private isMobile: boolean;
    private isActive: boolean = false;
    private startTime: number = 0;
    private playerSnake: Snake | null = null;
    
    private readonly CASH_OUT_DURATION = 4.0; 
    
    private onCashOutCompletedCallback: (() => void) | null = null;
    
    private enterPressed: boolean = false;

    constructor(app: PIXI.Application, worldContainer: PIXI.Container) {
        this.app = app;
        this.worldContainer = worldContainer;
        
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        this.setupComponents();
        this.setupKeyboardHandling();
    }

    private setupComponents(): void {
        
        this.cashOutTimer = new CashOutTimer(this.app, this.isMobile);
        
        this.progressRing = new CashOutProgressRing();
        this.worldContainer.addChild(this.progressRing.getContainer());
        /*
        if (this.isMobile) {
            
            this.cashOutButton = new CashOutButton(this.app);
            this.setupButtonCallbacks();
        } else {
            
            this.createInstructionText();
        }*/
    }

    private createInstructionText(): void {
        this.cashOutInstructionText = new PIXI.Text('Hold "Enter" to cash out', {
            fontFamily: 'Roboto',
            fontSize: 12,
            fill: 0xffffff,
            align: 'center'
        });
        
        this.cashOutInstructionText.anchor.set(0.5);
        this.cashOutInstructionText.zIndex = 10001; 
        
        this.updateInstructionTextPosition();
        
        this.app.stage.addChild(this.cashOutInstructionText);
        
        this.setupInstructionTextResize();
    }

    private updateInstructionTextPosition(): void {
        if (!this.cashOutInstructionText) return;
        
        const padding = 20;
        const buttonWidth = 120; 
        const buttonHeight = 50; 
        
        this.cashOutInstructionText.position.set(
            this.app.screen.width/2 - buttonWidth/2,
            this.app.screen.height - buttonHeight/2 - padding-10 
        );
    }

    private setupInstructionTextResize(): void {
        const originalResize = window.onresize;
        window.onresize = (event) => {
            if (originalResize) originalResize.call(window, event as UIEvent);
            this.updateInstructionTextPosition();
        };
    }

    private setupButtonCallbacks(): void {
        if (!this.cashOutButton) return;
        
        this.cashOutButton.onCashOutStarted(() => {
            this.startCashOut();
        });
        
        this.cashOutButton.onCashOutEnded(() => {
            this.stopCashOut();
        });
    }

    private setupKeyboardHandling(): void {
        if (this.isMobile) return; 
        
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.key === 'Enter') {
                event.preventDefault();
                if (!this.enterPressed) {
                    this.enterPressed = true;
                    this.startCashOut();
                    
                    if (this.cashOutInstructionText) {
                        this.cashOutInstructionText.style.fill = 0x4CAF50; 
                    }
                }
            }
        });

        document.addEventListener('keyup', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.key === 'Enter') {
                if (this.enterPressed) {
                    this.enterPressed = false;
                    this.stopCashOut();
                    
                    if (this.cashOutInstructionText) {
                        this.cashOutInstructionText.style.fill = 0xffffff; 
                    }
                }
            }
        });
    }

    private startCashOut(): void {
        if (this.isActive || !this.playerSnake) return;
        
        console.log('Starting cash out process...');
        this.isActive = true;
        this.startTime = Date.now();
        
        this.cashOutTimer.show();
        
        const snakeHeadRadius = this.getSnakeHeadRadius();
        this.progressRing.show(snakeHeadRadius);
    }

    private stopCashOut(): void {
        if (!this.isActive) return;
        
        console.log('Stopping cash out process...');
        this.isActive = false;
        
        this.cashOutTimer.hide();
        this.progressRing.hide();
    }

    private completeCashOut(): void {
        console.log('Cash out completed!');
        this.isActive = false;
        
        this.cashOutTimer.hide();
        this.progressRing.hide();
        
        if (this.cashOutInstructionText) {
            this.cashOutInstructionText.style.fill = 0xffffff;
        }
        
        if (this.onCashOutCompletedCallback) {
            this.onCashOutCompletedCallback();
        }
    }

    private getSnakeHeadRadius(): number {
        if (!this.playerSnake) return 20; 
        
        if ('getCurrentRadius' in this.playerSnake && typeof this.playerSnake.getCurrentRadius === 'function') {
            return (this.playerSnake as any).getCurrentRadius();
        }
        
        const baseRadius = 20;
        const growth = Math.min(this.playerSnake.getLength() - 10, 100) * 0.1;
        return baseRadius * (1 + growth);
    }

    public update(): void {
        if (!this.isActive || !this.playerSnake) return;
        
        const elapsed = (Date.now() - this.startTime) / 1000; 
        const progress = elapsed / this.CASH_OUT_DURATION;
        const remainingTime = this.CASH_OUT_DURATION - elapsed;
        
        if (progress >= 1.0) {
            
            this.completeCashOut();
            return;
        }
        
        this.cashOutTimer.updateTimer(remainingTime);
        
        const snakeHeadRadius = this.getSnakeHeadRadius();
        const headPosition = this.playerSnake.getHeadPosition();
        this.progressRing.updatePosition(headPosition.x, headPosition.y);
        this.progressRing.updateProgress(progress, snakeHeadRadius);
    }

    public setPlayerSnake(snake: Snake): void {
        this.playerSnake = snake;
    }

    public setVisible(visible: boolean): void {
        if (this.isMobile && this.cashOutButton) {
            this.cashOutButton.setVisible(visible);
        } else if (!this.isMobile && this.cashOutInstructionText) {
            this.cashOutInstructionText.visible = visible;
        }
    }

    public getCashOutButton(): CashOutButton | null {
        return this.cashOutButton;
    }

    public isInProgress(): boolean {
        return this.isActive;
    }

    public onCashOutCompleted(callback: () => void): void {
        this.onCashOutCompletedCallback = callback;
    }

    public destroy(): void {
        
        if (!this.isMobile) {
            document.removeEventListener('keydown', this.setupKeyboardHandling);
            document.removeEventListener('keyup', this.setupKeyboardHandling);
        }
        
        if (this.cashOutButton) {
            this.cashOutButton.destroy();
        }
        
        if (this.cashOutInstructionText) {
            if (this.cashOutInstructionText.parent) {
                this.cashOutInstructionText.parent.removeChild(this.cashOutInstructionText);
            }
            this.cashOutInstructionText.destroy();
        }
        
        this.cashOutTimer.destroy();
        this.progressRing.destroy();
    }
}