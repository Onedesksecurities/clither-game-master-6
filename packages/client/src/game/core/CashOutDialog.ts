import * as PIXI from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';

export interface CashOutDialogData {
    won: boolean,
    rank: number;
    winLose: number;
    length: number;
    time: number;
    kills: number;
}

export class CashOutDialog {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private overlay!: PIXI.Graphics;
    private dialogContainer!: PIXI.Container;
    private background!: PIXI.Graphics;

    private titleText!: PIXI.Text;
    private subtitleText!: PIXI.Text;
    private winText!: PIXI.Text;
    private statsContainer!: PIXI.Container;

    private homeButton!: PIXI.Container;
    private withdrawButton!: PIXI.Container;

    private onHomeCallback: (() => void) | null = null;
    private onWithdrawCallback: (() => void) | null = null;

    private readonly DIALOG_WIDTH = 400;
    private readonly DIALOG_HEIGHT = 350;
    private readonly BUTTON_WIDTH = 180;
    private readonly BUTTON_HEIGHT = 50;
    private readonly CORNER_RADIUS = 12;

    private readonly HANDLE_WIDTH = 8;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
        this.container.zIndex = 20000;

        this.createDialog();
        this.setupInteraction();
        this.updatePosition();
        this.setupResize();

        this.container.visible = false;

        this.app.stage.addChild(this.container);
    }

    private createDialog(): void {

        this.overlay = new PIXI.Graphics();
        this.overlay.beginFill(0x000000, 0.7);
        this.overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        this.overlay.endFill();
        this.container.addChild(this.overlay);

        this.dialogContainer = new PIXI.Container();
        this.container.addChild(this.dialogContainer);

        this.background = new PIXI.Graphics();
        this.drawBackground();
        this.dialogContainer.addChild(this.background);

        this.createTitle();
        this.createWinLoseSection();
        this.createStatsSection();
        this.createButtons();
    }

    private drawBackground(): void {
        this.background.clear();

        this.background.beginFill(0x1a1a1a, 1.0);
        this.background.drawRoundedRect(this.HANDLE_WIDTH / 2, 0, this.DIALOG_WIDTH, this.DIALOG_HEIGHT, this.CORNER_RADIUS);
        this.background.endFill();

        this.background.beginFill(0xFFFFFF, 1.0);
        this.background.drawRoundedRect(0, 0, this.HANDLE_WIDTH, this.DIALOG_HEIGHT, this.CORNER_RADIUS);
        this.background.endFill();

    }

    private createTitle(): void {

        this.titleText = new PIXI.Text('Game Ends', {
            fontFamily: 'Norwester',
            fontSize: 32,
            fill: 0xffffff,
            align: 'center',
            fontWeight: 'bold',
            letterSpacing: 2
        });
        this.titleText.anchor.set(0.5);
        this.titleText.position.set(this.DIALOG_WIDTH / 2, 50);
        this.dialogContainer.addChild(this.titleText);

        this.subtitleText = new PIXI.Text('"The Last Bite!"', {
            fontFamily: 'Roboto',
            fontSize: 12,
            fill: 0xcccccc,
            align: 'center',
            fontStyle: 'italic'
        });
        this.subtitleText.anchor.set(0.5);
        this.subtitleText.position.set(this.DIALOG_WIDTH / 2, 80);
        this.dialogContainer.addChild(this.subtitleText);
    }

    private createWinLoseSection(): void {

        const glowFilter = new GlowFilter({
            distance: 5,
            outerStrength: 2,
            innerStrength: 0,
            color: 0x00EDB3,
            quality: 0.5
        });

        this.winText = new PIXI.Text('WIN', {
            fontFamily: 'Norwester',
            fontSize: 48,
            fill: 0x00EDB3,
            align: 'center',
        });
        this.winText.filters = [glowFilter];
        this.winText.anchor.set(0.5);
        this.winText.position.set(this.DIALOG_WIDTH / 2, 130);
        this.dialogContainer.addChild(this.winText);
    }

    private createStatsSection(): void {
        this.statsContainer = new PIXI.Container();
        this.statsContainer.position.set(50, 180);
        this.dialogContainer.addChild(this.statsContainer);
    }

    private updateStats(data: CashOutDialogData): void {

        this.statsContainer.removeChildren();

        const winLoseColor = data.won ? 0x00EDB3 : 0xFF5757
        const glowFilter = new GlowFilter({
            distance: 5,
            outerStrength: 2,
            innerStrength: 0,
            color: winLoseColor,
            quality: 0.5
        });

        this.winText = new PIXI.Text(data.won ? 'WIN' : 'LOSE', {
            fontFamily: 'Norwester',
            fontSize: 48,
            fill: winLoseColor,
            align: 'center',
        });
        this.winText.filters = [glowFilter];

        const stats = [
            { icon: '🏆', label: 'RANK', value: `#${data.rank}` },
            { icon: '💰', label: 'WINNINGS', value: `$${data.winLose.toFixed(2)}`, isWinnings: data.won },
            { icon: '📏', label: 'LENGTH', value: data.length.toString() },
            { icon: '⏰', label: 'TIME', value: this.formatTime(data.time) },
            { icon: '💀', label: 'KILLS', value: data.kills.toString() }
        ];

        stats.forEach((stat, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = col * 150;
            const y = row * 40;

            let labelColor = 0x888888
            if (stat.isWinnings != undefined) {
                labelColor = winLoseColor
            }

            const labelText = new PIXI.Text(`${stat.icon} ${stat.label} : ${stat.value}`, {
                fontFamily: 'Norwester',
                fontSize: 16,
                fill: labelColor,
                fontWeight: 'bold'
            });
            labelText.position.set(x, y);
            this.statsContainer.addChild(labelText);

            if (stat.isWinnings) {
                const arrow = new PIXI.Graphics();
                arrow.beginFill(0x4CAF50);
                arrow.moveTo(0, 0);
                arrow.lineTo(10, -5);
                arrow.lineTo(10, -2);
                arrow.lineTo(20, -2);
                arrow.lineTo(20, 2);
                arrow.lineTo(10, 2);
                arrow.lineTo(10, 5);
                arrow.closePath();
                arrow.endFill();
                arrow.position.set(x + 120, y + 18);
                this.statsContainer.addChild(arrow);
            }
        });
    }

    private formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}.${remainingSeconds.toString().padStart(2, '0')}.${Math.floor((seconds % 1) * 100).toString().padStart(2, '0')}`;
    }

    private createButtons(): void {
        const buttonY = this.DIALOG_HEIGHT - this.BUTTON_HEIGHT - 10;
        const buttonSpacing = 20;
        const totalButtonWidth = this.BUTTON_WIDTH * 2 + buttonSpacing;
        const startX = (this.DIALOG_WIDTH - totalButtonWidth) / 2;

        this.homeButton = this.createButton('HOME', 0xC0C0C0, startX, buttonY);
        this.dialogContainer.addChild(this.homeButton);

        this.withdrawButton = this.createButton('WITHDRAW', 0xffffff, startX + this.BUTTON_WIDTH + buttonSpacing, buttonY);
        this.dialogContainer.addChild(this.withdrawButton);
    }

    private createButton(text: string, color: number, x: number, y: number): PIXI.Container {
        const buttonContainer = new PIXI.Container();
        buttonContainer.position.set(x, y);
        buttonContainer.eventMode = 'static';
        buttonContainer.cursor = 'pointer';

        const bg = new PIXI.Graphics();
        bg.beginFill(color, text === 'HOME' ? 0.2 : 1.0);
        bg.drawRoundedRect(0, 0, this.BUTTON_WIDTH, this.BUTTON_HEIGHT, 8);
        bg.endFill();
        buttonContainer.addChild(bg);

        const buttonText = new PIXI.Text(text, {
            fontFamily: 'Norwester',
            fontSize: 19,
            fill: text === 'HOME' ? 0xffffff : 0x000000,
            align: 'center',
            fontWeight: 'bold'
        });
        buttonText.anchor.set(0.5);
        buttonText.position.set(this.BUTTON_WIDTH / 2, this.BUTTON_HEIGHT / 2 + 5);
        buttonContainer.addChild(buttonText);

        buttonContainer.on('pointerover', () => {
            bg.alpha = 0.8;
            buttonContainer.scale.set(1.02);
        });

        buttonContainer.on('pointerout', () => {
            bg.alpha = 1;
            buttonContainer.scale.set(1);
        });

        buttonContainer.on('pointerdown', () => {
            buttonContainer.scale.set(0.98);
        });

        buttonContainer.on('pointerup', () => {
            buttonContainer.scale.set(1.02);
            if (text === 'HOME' && this.onHomeCallback) {
                this.onHomeCallback();
            } else if (text === 'WITHDRAW' && this.onWithdrawCallback) {
                this.onWithdrawCallback();
            }
        });

        return buttonContainer;
    }

    private setupInteraction(): void {

        this.overlay.eventMode = 'static';
    }

    private updatePosition(): void {

        this.dialogContainer.position.set(
            (this.app.screen.width - this.DIALOG_WIDTH) / 2,
            (this.app.screen.height - this.DIALOG_HEIGHT) / 2
        );

        this.overlay.clear();
        this.overlay.beginFill(0x000000, 0.7);
        this.overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        this.overlay.endFill();
    }

    private setupResize(): void {
        const originalResize = window.onresize;
        window.onresize = (event) => {
            if (originalResize) originalResize.call(window, event as UIEvent);
            this.updatePosition();
        };
    }

    public show(data: CashOutDialogData): void {
        this.updateStats(data);
        this.container.visible = true;

        this.dialogContainer.alpha = 0;
        this.dialogContainer.scale.set(0.8);

        const startTime = Date.now();
        const duration = 300;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            this.dialogContainer.alpha = eased;
            this.dialogContainer.scale.set(0.8 + (0.2 * eased));

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

            this.dialogContainer.alpha = 1 - eased;
            this.dialogContainer.scale.set(1 - (0.2 * eased));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.container.visible = false;
            }
        };

        animate();
    }

    public onHome(callback: () => void): void {
        this.onHomeCallback = callback;
    }

    public onWithdraw(callback: () => void): void {
        this.onWithdrawCallback = callback;
    }

    public destroy(): void {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true, texture: true, baseTexture: true });
    }

    public getContainer(): PIXI.Container {
        return this.container;
    }
}