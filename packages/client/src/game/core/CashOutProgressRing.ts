
import * as PIXI from 'pixi.js';

export class CashOutProgressRing {
    private container: PIXI.Container;
    private progressGraphics!: PIXI.Graphics;
    private backgroundGraphics!: PIXI.Graphics;
    private glowGraphics!: PIXI.Graphics;
    
    private readonly RING_THICKNESS = 6;
    private readonly GLOW_THICKNESS = 12;
    
    private readonly BACKGROUND_COLOR = 0x333333;
    private readonly PROGRESS_COLOR = 0x4CAF50;
    private readonly GLOW_COLOR = 0x66BB6A;

    constructor() {
        this.container = new PIXI.Container();
        this.container.zIndex = 1000; 
        
        this.createRingElements();
        this.container.visible = false;
    }

    private createRingElements(): void {
        
        this.backgroundGraphics = new PIXI.Graphics();
        this.container.addChild(this.backgroundGraphics);
        
        this.glowGraphics = new PIXI.Graphics();
        this.container.addChild(this.glowGraphics);
        
        this.progressGraphics = new PIXI.Graphics();
        this.container.addChild(this.progressGraphics);
    }

    private drawRing(graphics: PIXI.Graphics, radius: number, thickness: number, 
                    color: number, alpha: number, startAngle: number = 0, 
                    endAngle: number = Math.PI * 2): void {
        graphics.clear();
        
        if (startAngle >= endAngle) return;
        
        graphics.lineStyle(thickness, color, alpha);
        graphics.arc(0, 0, radius, startAngle, endAngle);
    }

    public show(snakeHeadRadius: number): void {
        this.container.visible = true;
        
        const ringRadius = snakeHeadRadius + 15; 
        
        this.drawRing(this.backgroundGraphics, ringRadius, this.RING_THICKNESS, 
                     this.BACKGROUND_COLOR, 0.5);
        
        this.updateProgress(0, ringRadius);
        
        this.container.alpha = 0;
        this.container.scale.set(0.5);
        
        const startTime = Date.now();
        const duration = 300;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); 
            
            this.container.alpha = eased;
            this.container.scale.set(0.5 + (0.5 * eased));
            
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
            this.container.scale.set(1 - (0.5 * eased));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.container.visible = false;
            }
        };
        
        animate();
    }

    public updateProgress(progress: number, snakeHeadRadius: number): void {
        const ringRadius = snakeHeadRadius + 15;
        
        progress = Math.max(0, Math.min(1, progress));
        
        const startAngle = -Math.PI / 2; 
        const endAngle = startAngle + (progress * Math.PI * 2); 
        
        if (progress > 0) {
            this.drawRing(this.glowGraphics, ringRadius + 2, this.GLOW_THICKNESS, 
                         this.GLOW_COLOR, 0.3, startAngle, endAngle);
        } else {
            this.glowGraphics.clear();
        }
        
        if (progress > 0) {
            this.drawRing(this.progressGraphics, ringRadius, this.RING_THICKNESS, 
                         this.PROGRESS_COLOR, 1.0, startAngle, endAngle);
            
            if (progress > 0.8) {
                const pulseIntensity = (progress - 0.8) / 0.2; 
                const pulse = 1 + 0.1 * pulseIntensity * Math.sin(Date.now() * 0.01);
                this.progressGraphics.scale.set(pulse);
                this.glowGraphics.scale.set(pulse);
            } else {
                this.progressGraphics.scale.set(1);
                this.glowGraphics.scale.set(1);
            }
        } else {
            this.progressGraphics.clear();
            this.glowGraphics.clear();
        }
    }

    public updatePosition(x: number, y: number): void {
        this.container.position.set(x, y);
    }

    public getContainer(): PIXI.Container {
        return this.container;
    }

    public destroy(): void {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}