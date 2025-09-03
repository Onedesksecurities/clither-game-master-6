import * as PIXI from 'pixi.js';

interface PlayerStatsData {
    kills: number;
    cash: number;
}

export class PlayerStats {
    private app: PIXI.Application;
    private container: PIXI.Container;

    private killsContainer!: PIXI.Container;
    private cashContainer!: PIXI.Container;

    private killsBackground!: PIXI.Graphics;
    private cashBackground!: PIXI.Graphics;

    private killsIcon!: PIXI.Sprite;
    private cashIcon!: PIXI.Sprite;

    private killsText!: PIXI.Text;
    private cashText!: PIXI.Text;

    private killsTitleText!: PIXI.Text;
    private cashTitleText!: PIXI.Text;

    private readonly CONTAINER_WIDTH = 120;
    private readonly CONTAINER_HEIGHT = 50;
    private readonly HANDLE_WIDTH = 8;
    private readonly CONTAINER_SPACING = 8;
    private readonly ICON_SIZE = 24;
    private readonly CORNER_RADIUS = 8;
    private readonly PADDING = 10;
    private readonly FONT_SIZE = 20;
    private readonly FONT_FAMILY = 'Norwester';

    private kills = 0;
    private cash = 0;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
        this.container.zIndex = 9998;

        this.createStatsContainers();
        this.createIcons();
        this.createTexts();
        this.updatePosition();

        this.app.stage.addChild(this.container);
        this.setupResize();

        this.updateStats({ kills: this.kills, cash: this.cash });
    }

    private createStatsContainers(): void {
        this.killsContainer = new PIXI.Container();
        this.killsBackground = new PIXI.Graphics();
        this.drawBackground(this.killsBackground, 0x545354, 0xFFFFFF);
        this.killsContainer.addChild(this.killsBackground);
        this.cashContainer = new PIXI.Container();
        this.cashBackground = new PIXI.Graphics();
        this.drawBackground(this.cashBackground, 0x0C3C27, 0x01B775);
        this.cashContainer.addChild(this.cashBackground);
        this.cashContainer.y = this.CONTAINER_HEIGHT + this.CONTAINER_SPACING;
        this.cashContainer.visible =false
        this.container.addChild(this.killsContainer);
        this.container.addChild(this.cashContainer);
    }

    private drawBackground(graphics: PIXI.Graphics, color: number, handleColor: number): void {
        graphics.clear();
        graphics.beginFill(color, 1.0);
        graphics.drawRoundedRect(this.HANDLE_WIDTH / 2, 0, this.CONTAINER_WIDTH, this.CONTAINER_HEIGHT, this.CORNER_RADIUS);
        graphics.endFill();

        graphics.beginFill(handleColor, 1.0);
        graphics.drawRoundedRect(0, 0, this.HANDLE_WIDTH, this.CONTAINER_HEIGHT, this.CORNER_RADIUS);
        graphics.endFill();
    }

    private createIcons(): void {
        const killsIconGraphics = new PIXI.Graphics();
        this.createSkullIcon(killsIconGraphics);
        const killsIconTexture = this.app.renderer.generateTexture(killsIconGraphics);
        this.killsIcon = new PIXI.Sprite(killsIconTexture);
        this.killsIcon.width = this.ICON_SIZE;
        this.killsIcon.height = this.ICON_SIZE;
        this.killsIcon.position.set(this.PADDING + this.HANDLE_WIDTH / 2, ((this.CONTAINER_HEIGHT - this.ICON_SIZE) / 2) + 5);
        this.killsContainer.addChild(this.killsIcon);

        const cashIconGraphics = new PIXI.Graphics();
        this.createDollarIcon(cashIconGraphics);
        const cashIconTexture = this.app.renderer.generateTexture(cashIconGraphics);
        this.cashIcon = new PIXI.Sprite(cashIconTexture);
        this.cashIcon.width = this.ICON_SIZE;
        this.cashIcon.height = this.ICON_SIZE;
        this.cashIcon.position.set(this.PADDING + this.HANDLE_WIDTH / 2, ((this.CONTAINER_HEIGHT - this.ICON_SIZE) / 2) + 5);
        this.cashContainer.addChild(this.cashIcon);

        killsIconGraphics.destroy();
        cashIconGraphics.destroy();
    }

    private createSkullIcon(graphics: PIXI.Graphics): void {
        graphics.beginFill(0xffffff);

        graphics.drawCircle(12, 10, 8);
        graphics.drawRect(8, 16, 8, 6);
        graphics.endFill();

        graphics.beginFill(0x000000);
        graphics.drawCircle(9, 9, 2);
        graphics.drawCircle(15, 9, 2);
        graphics.endFill();
    }

    private createDollarIcon(graphics: PIXI.Graphics): void {
        graphics.lineStyle(3, 0x01B775, 1);

        graphics.moveTo(12, 4);
        graphics.lineTo(12, 20);
        graphics.moveTo(8, 6);
        graphics.quadraticCurveTo(12, 4, 16, 8);
        graphics.quadraticCurveTo(12, 12, 8, 16);
        graphics.quadraticCurveTo(12, 18, 16, 20);
    }

    private createTexts(): void {
        const textStyle = new PIXI.TextStyle({
            fontFamily: this.FONT_FAMILY,
            fontSize: this.FONT_SIZE,
            fill: 0xffffff,
            fontWeight: 'bold'
        });

        this.killsText = new PIXI.Text('0', textStyle);
        this.killsText.anchor.set(0, 0.5);
        this.killsText.position.set(
            this.PADDING + this.ICON_SIZE + 20,
            1.8 * this.CONTAINER_HEIGHT / 3
        );
        this.killsContainer.addChild(this.killsText);

        const cashTextStyle = new PIXI.TextStyle({
            fontFamily: this.FONT_FAMILY,
            fontSize: this.FONT_SIZE,
            fill: 0xFFFFFF,
            fontWeight: 'bold'
        });

        this.cashText = new PIXI.Text('-', cashTextStyle);
        this.cashText.anchor.set(0, 0.5);
        this.cashText.position.set(
            this.PADDING + this.ICON_SIZE + 20,
            1.8 * this.CONTAINER_HEIGHT / 3
        );
        this.cashContainer.addChild(this.cashText);

        const titleStyle = new PIXI.TextStyle({
            fontFamily: this.FONT_FAMILY,
            fontSize: 12,
            fill: 0xffffff,
            fontWeight: 'bold'
        });

        this.killsTitleText = new PIXI.Text('Kills', titleStyle);
        this.killsTitleText.anchor.set(0, 0.5);
        this.killsTitleText.position.set(
            this.PADDING + this.HANDLE_WIDTH / 2,
            this.CONTAINER_HEIGHT / 5
        );
        this.killsContainer.addChild(this.killsTitleText);

        const cashtitleStyle = new PIXI.TextStyle({
            fontFamily: this.FONT_FAMILY,
            fontSize: 12,
            fill: 0x01B775,
            fontWeight: 'bold'
        });

        this.cashTitleText = new PIXI.Text('Cash', cashtitleStyle);
        this.cashTitleText.anchor.set(0, 0.5);
        this.cashTitleText.position.set(
            this.PADDING + this.HANDLE_WIDTH / 2,
            this.CONTAINER_HEIGHT / 5
        );
        this.cashContainer.addChild(this.cashTitleText);
    }

    private updatePosition(): void {
        const padding = 15;
        this.container.position.set(
            padding,
            this.app.screen.height - (this.CONTAINER_HEIGHT * 2 + this.CONTAINER_SPACING) - padding
        );
    }

    private setupResize(): void {
        const originalResize = window.onresize;
        window.onresize = (event) => {
            if (originalResize) originalResize.call(window, event as UIEvent);
            this.updatePosition();
        };
    }

    public updateStats(stats: PlayerStatsData): void {
        this.kills = stats.kills
        this.cash = stats.cash
        this.killsText.text = stats.kills.toString();
        this.cashText.text = `$${stats.cash.toFixed(2)}`;
    }

    public updateKills(kills: number): void {
        this.kills = kills
        this.killsText.text = kills.toString();

        if (kills > parseInt(this.killsText.text)) {
            this.animateKillsIncrease();
        }
    }

    public updateCash(cash: number): void {
        this.cash = cash
        this.cashText.text = `$${cash.toFixed(2)}`;
    }

    private animateKillsIncrease(): void {
        const originalScale = this.killsContainer.scale.x;
        this.killsContainer.scale.set(originalScale * 1.1);

        const animate = () => {
            const currentScale = this.killsContainer.scale.x;
            const targetScale = originalScale;
            const newScale = currentScale + (targetScale - currentScale) * 0.2;

            this.killsContainer.scale.set(newScale);

            if (Math.abs(newScale - targetScale) > 0.01) {
                requestAnimationFrame(animate);
            } else {
                this.killsContainer.scale.set(targetScale);
            }
        };

        setTimeout(animate, 50);
    }

    public setCustomIcons(killsIconTexture: PIXI.Texture, cashIconTexture: PIXI.Texture): void {

        this.killsIcon.texture = killsIconTexture;

        this.cashIcon.texture = cashIconTexture;
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

    public getCurrentCash(): number {
        return this.cash;
    }

    public getCurrentKills(): number {
        return this.kills;
    }
}