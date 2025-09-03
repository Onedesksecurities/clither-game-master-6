import * as PIXI from 'pixi.js';

interface LeaderboardEntry {
    id: string;
    username: string;
    score: number;
    cash?: number;
}

interface LeaderboardLine {
    container: PIXI.Container;
    rank: PIXI.Text;
    name: PIXI.Text;
    score: PIXI.Text;
    cash: PIXI.Text;
}

export class Leaderboard {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private titleText!: PIXI.Text;
    private entryLines: LeaderboardLine[] = [];
    private readonly MAX_ENTRIES = 10;
    private readonly PADDING = 10;
    private readonly ENTRY_HEIGHT = 22;
    private readonly MIN_WIDTH = 250;
    private readonly FONT_FAMILY = 'Roboto';
    private readonly FONT_SIZE = 12;
    private readonly TITLE_FONT_SIZE = 14;

    private currentPlayerRank = 50;

    constructor(app: PIXI.Application) {
        this.app = app;

        this.container = new PIXI.Container();
        this.container.zIndex = 9999;

        this.createLeaderboardElements();
        this.updatePosition();

        this.app.stage.addChild(this.container);

        this.setupResize();
    }

    private createLeaderboardElements(): void {

        this.titleText = new PIXI.Text('Leaderboard', {
            fontFamily: this.FONT_FAMILY,
            fontSize: this.TITLE_FONT_SIZE,
            fill: 0xffffff,
            fontWeight: 'bold',
            align: 'center'
        });
        this.titleText.anchor.set(0.5, 0);
        this.container.addChild(this.titleText);

        for (let i = 0; i < this.MAX_ENTRIES; i++) {
            const lineContainer = new PIXI.Container();
            lineContainer.visible = false;

            const rankText = new PIXI.Text('', {
                fontFamily: this.FONT_FAMILY,
                fontWeight: 'bold', fontSize: this.FONT_SIZE, fill: 0xffffff
            });
            const nameText = new PIXI.Text('', {
                fontFamily: this.FONT_FAMILY,
                fontWeight: 'bold', fontSize: this.FONT_SIZE
            });
            const scoreText = new PIXI.Text('', { fontFamily: this.FONT_FAMILY, fontSize: this.FONT_SIZE, fill: 0xffffff });
            const cashText = new PIXI.Text('', { fontFamily: this.FONT_FAMILY, fontSize: this.FONT_SIZE, fill: 0x01B775 });

            lineContainer.addChild(rankText, nameText, scoreText, cashText);
            this.container.addChild(lineContainer);

            this.entryLines.push({
                container: lineContainer,
                rank: rankText,
                name: nameText,
                score: scoreText,
                cash: cashText,
            });
        }
    }

    public getPlayerRank(): number {
        return this.currentPlayerRank;
    }

    private updatePosition(): void {
        const padding = 10;
        this.container.position.set(
            this.app.screen.width - this.MIN_WIDTH - padding,
            0
        );
    }

    private setupResize(): void {
        const originalResize = window.onresize;
        window.onresize = (event) => {
            if (originalResize) originalResize.call(window, event as UIEvent);
            this.updatePosition();
        };
    }

    public updateLeaderboard(entries: LeaderboardEntry[], playerName?: string): void {

        this.titleText.x = this.MIN_WIDTH / 2;
        this.titleText.y = this.PADDING;

        this.entryLines.forEach(line => line.container.visible = false);

        const displayEntries = entries.slice(0, this.MAX_ENTRIES);

        displayEntries.forEach((entry, index) => {
            const line = this.entryLines[index];
            const rank = index + 1;

            if (entry.username === playerName) {
                this.currentPlayerRank = rank;
            }

            line.container.visible = true;

            line.rank.text = `${rank}.`.padEnd(3);
            line.name.text = this.truncateName(entry.username, 10);
            line.score.text = entry.score;
            line.cash.visible = false;
            line.cash.text = `($${entry.cash?.toFixed(2)})`;

            this.setEntryStyle(line, rank, entry.username === playerName);

            const scorePadding = 10;

            line.rank.position.set(0, 0);
            line.name.position.set(line.rank.width, 0);

            line.cash.position.set(this.MIN_WIDTH - line.cash.width - this.PADDING, 0);
            line.score.position.set(line.cash.x - line.score.width - scorePadding, 0);

            line.container.position.set(
                this.PADDING,
                this.titleText.y + this.titleText.height + this.PADDING + (index * this.ENTRY_HEIGHT)
            );
        });
    }

    private setEntryStyle(line: LeaderboardLine, rank: number, isPlayer: boolean): void {
        line.name.style.fontWeight = 'normal';

        if (isPlayer) {
            line.name.style.fill = 0x01B775;
            line.name.style.fontWeight = 'bold';
        } else {
            switch (rank) {
                case 1:
                    line.name.style.fill = 0xffd700;
                    break;
                case 2:
                    line.name.style.fill = 0xc0c0c0;
                    break;
                case 3:
                    line.name.style.fill = 0xcd7f32;
                    break;
                default:
                    line.name.style.fill = 0xffffff;
                    break;
            }
        }
    }

    private truncateName(name: string, maxLength: number): string {
        if (name.length <= maxLength) {
            return name;
        }
        return name.substring(0, maxLength - 2) + '..';
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
