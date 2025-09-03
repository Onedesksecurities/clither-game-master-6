import * as PIXI from 'pixi.js';

interface KillFeedEntry {
    id: string;
    killerName: string;
    victimName: string;
    method: 'wall' | 'snake';
    cash?: number;
    timestamp: number;
    container: PIXI.Container;
    textContainer: PIXI.Container;
}

export class KillFeed {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private entries: KillFeedEntry[] = [];

    private readonly MAX_ENTRIES = 2;
    private readonly ENTRY_HEIGHT = 32;
    private readonly ENTRY_SPACING = 5;
    private readonly CONTAINER_WIDTH = 280;
    private readonly CONTAINER_PADDING = 12;
    private readonly PADDING = 15;
    private readonly FONT_SIZE = 12;
    private readonly FONT_FAMILY = 'Arial';
    private readonly ANIMATION_DURATION = 500; 
    private readonly DISPLAY_DURATION = 5000; 
    private readonly WALL_KILLER_COLOR = 0xCEAC27;
    private readonly WALL_VICTIM_COLOR = 0x425ACE;

    private readonly KILLER_COLOR = 0xBF4141;
    private readonly VICTIM_COLOR = 0xCEAC27;
    private readonly CASH_COLOR = 0x01B775;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
        this.container.zIndex = 9997; 

        this.updatePosition();
        this.setupResize();

        //this.app.stage.addChild(this.container);
    }

    private updatePosition(): void {
        const padding = this.PADDING;
        const playerStatsHeight = 88; 

        this.container.position.set(
            0,
            this.app.screen.height - playerStatsHeight - padding - (this.MAX_ENTRIES * (this.ENTRY_HEIGHT + this.ENTRY_SPACING)) - 10
        );
    }

    private setupResize(): void {
        const originalResize = window.onresize;
        window.onresize = (event) => {
            if (originalResize) originalResize.call(window, event as UIEvent);
            this.updatePosition();
        };
    }

    private createKillText(killerName: string, victimName: string, method: 'wall' | 'snake', cash?: number): PIXI.Container {
        const textContainer = new PIXI.Container();
        let currentX = this.CONTAINER_PADDING;

        const baseStyle = {
            fontFamily: this.FONT_FAMILY,
            fontSize: this.FONT_SIZE,
            fontWeight: 'normal' as const
        };

        if (method === 'wall') {
            
            const victimText = new PIXI.Text(`- ${victimName}`, {
                ...baseStyle,
                fill: this.WALL_VICTIM_COLOR,
                fontWeight: 'bold'
            });
            victimText.position.set(currentX, (this.ENTRY_HEIGHT - victimText.height) / 2);
            textContainer.addChild(victimText);
            currentX += victimText.width + 4;

            const killedText = new PIXI.Text('killed', {
                ...baseStyle,
                fill: 0xFFFFFF,
                fontWeight: 'bold'
            });
            killedText.position.set(currentX, (this.ENTRY_HEIGHT - killedText.height) / 2);
            textContainer.addChild(killedText);
            currentX += killedText.width + 4;

            const byText = new PIXI.Text('By', {
                ...baseStyle,
                fill: this.WALL_KILLER_COLOR,
                fontWeight: 'bold'
            });
            byText.position.set(currentX, (this.ENTRY_HEIGHT - byText.height) / 2);
            textContainer.addChild(byText);
            currentX += byText.width + 4;

            const wallText = new PIXI.Text('arena wall', {
                ...baseStyle,
                fill: 0xFFFFFF
            });
            wallText.position.set(currentX, (this.ENTRY_HEIGHT - wallText.height) / 2);
            textContainer.addChild(wallText);
        } else {

            const killerText = new PIXI.Text(`- ${killerName}`, {
                ...baseStyle,
                fill: this.KILLER_COLOR,
                fontWeight: 'bold'
            });
            killerText.position.set(currentX, (this.ENTRY_HEIGHT - killerText.height) / 2);
            textContainer.addChild(killerText);
            currentX += killerText.width + 4;

            const killedText = new PIXI.Text('killed', {
                ...baseStyle,
                fill: 0xFFFFFF,
                fontWeight: 'bold'
            });
            killedText.position.set(currentX, (this.ENTRY_HEIGHT - killedText.height) / 2);
            textContainer.addChild(killedText);
            currentX += killedText.width + 4;

            const victimText = new PIXI.Text(victimName, {
                ...baseStyle,
                fill: this.VICTIM_COLOR,
                fontWeight: 'bold'
            });
            victimText.position.set(currentX, (this.ENTRY_HEIGHT - victimText.height) / 2);
            textContainer.addChild(victimText);
            currentX += victimText.width + 4;

            const andEarnedText = new PIXI.Text('and eanred', {
                ...baseStyle,
                fill: 0xFFFFFF
            });
            andEarnedText.position.set(currentX, (this.ENTRY_HEIGHT - andEarnedText.height) / 2);
            textContainer.addChild(andEarnedText);
            currentX += andEarnedText.width + 4;

            const cashText = new PIXI.Text(`$${cash?.toFixed(2)}`, {
                ...baseStyle,
                fill: this.CASH_COLOR
            });
            cashText.position.set(currentX, (this.ENTRY_HEIGHT - cashText.height) / 2);
            textContainer.addChild(cashText);
        }

        return textContainer;
    }

    private animateEntryIn(entry: KillFeedEntry): void {
        
        entry.container.x = this.CONTAINER_WIDTH;
        entry.container.alpha = 0;
        entry.container.scale.set(0.8);

        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.ANIMATION_DURATION, 1);

            const easedProgress = this.easeOutCubic(progress);

            entry.container.x = this.CONTAINER_WIDTH * (1 - easedProgress);
            entry.container.alpha = easedProgress;
            entry.container.scale.set(0.8 + (0.2 * easedProgress));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                
                setTimeout(() => {
                    this.removeEntry(entry.id);
                }, this.DISPLAY_DURATION);
            }
        };

        animate();
    }

    private animateEntryOut(entry: KillFeedEntry, onComplete: () => void): void {
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.ANIMATION_DURATION, 1);

            const easedProgress = this.easeInCubic(progress);

            entry.container.x = this.CONTAINER_WIDTH * easedProgress;
            entry.container.alpha = 1 - easedProgress;
            entry.container.scale.set(1 - (0.2 * easedProgress));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                onComplete();
            }
        };

        animate();
    }

    private easeOutCubic(t: number): number {
        return 1 - Math.pow(1 - t, 3);
    }

    private easeInCubic(t: number): number {
        return t * t * t;
    }

    private repositionEntries(): void {
        this.entries.forEach((entry, index) => {
            const targetY = index * (this.ENTRY_HEIGHT + this.ENTRY_SPACING);

            if (entry.container.y !== targetY) {
                const startY = entry.container.y;
                const startTime = Date.now();
                const duration = 300;

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = this.easeOutCubic(progress);

                    entry.container.y = startY + (targetY - startY) * easedProgress;

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                };

                animate();
            }
        });
    }

    public addKill(killerName: string, victimName: string, method: 'wall' | 'snake', cash?: number): void {
        const id = `${Date.now()}_${Math.random()}`;

        const entryContainer = new PIXI.Container();

        const textContainer = this.createKillText(killerName, victimName, method, cash);
        entryContainer.addChild(textContainer);

        const entry: KillFeedEntry = {
            id,
            killerName,
            victimName,
            method,
            cash,
            timestamp: Date.now(),
            container: entryContainer,
            textContainer
        };

        this.container.addChild(entryContainer);

        this.entries.unshift(entry);

        if (this.entries.length > this.MAX_ENTRIES) {
            const oldEntry = this.entries.pop()!;
            this.removeEntryImmediate(oldEntry);
        }

        this.repositionEntries();

        this.animateEntryIn(entry);
    }

    private removeEntry(id: string): void {
        const entryIndex = this.entries.findIndex(entry => entry.id === id);
        if (entryIndex === -1) return;

        const entry = this.entries[entryIndex];
        this.entries.splice(entryIndex, 1);

        this.animateEntryOut(entry, () => {
            this.removeEntryImmediate(entry);
            this.repositionEntries();
        });
    }

    private removeEntryImmediate(entry: KillFeedEntry): void {
        if (entry.container.parent) {
            entry.container.parent.removeChild(entry.container);
        }
        entry.container.destroy({ children: true });
    }

    public clear(): void {
        this.entries.forEach(entry => {
            this.removeEntryImmediate(entry);
        });
        this.entries = [];
    }

    public setVisible(visible: boolean): void {
        this.container.visible = visible;
    }

    public destroy(): void {
        this.clear();

        if (this.container) {
            if (this.container.parent) {
                this.container.parent.removeChild(this.container);
            }
            this.container.destroy({ children: true, texture: true, baseTexture: true });
        }
    }

    public getContainer(): PIXI.Container {
        return this.container;
    }
}