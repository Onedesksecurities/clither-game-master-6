
import * as PIXI from 'pixi.js';

import { PlayerStats } from './PlayerStats';
import { KillFeed } from './KillFeed';

export class GameUI {
    private app: PIXI.Application;
    private scoreText!: PIXI.Text;
    private playerCountText!: PIXI.Text;
    private pingText!: PIXI.Text;

    private playerStats: PlayerStats;
    private killFeed: KillFeed;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.createUIElements();
        this.setupResize();

        this.playerStats = new PlayerStats(this.app);
        this.killFeed = new KillFeed(this.app);
        this.loadCustomIcons()
    }

    public addKillToFeed(killerName: string, victimName: string, method: 'wall' | 'snake', cash?: number): void {
        this.killFeed.addKill(killerName, victimName, method, cash);
    }

    public getKillFeed(): KillFeed {
        return this.killFeed;
    }

    public getPlayerStats(): PlayerStats {
        return this.playerStats;
    }

    public updatePlayerStatsData(kills: number, cash: number): void {
        this.playerStats.updateStats({ kills, cash });
    }

    private createUIElements(): void {
        this.scoreText = new PIXI.Text('Snake Length : -', {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xffffff,
            align: 'center'
        });

        this.playerCountText = new PIXI.Text('Total Snakes : -/50', {
            fontFamily: 'Arial',
            fontSize: 10,
            fill: 0xffffff,
            align: 'center'
        });

        this.pingText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 10,
            fill: 0xffffff,
            align: 'left',
        });

        this.app.stage.addChild(this.scoreText, this.pingText, this.playerCountText);
    }

    private setupResize(): void {
        window.onresize = () => {
            this.app.renderer.resize(window.innerWidth, window.innerHeight);
            this.updatePositions();
        };
    }

    public async loadCustomIcons(): Promise<void> {
        try {
            const killsIconTexture = await PIXI.Assets.load('icons/skull.png');
            const cashIconTexture = await PIXI.Assets.load('icons/cash.png');
            this.playerStats.setCustomIcons(killsIconTexture, cashIconTexture);
        } catch (error) {
            console.warn('Could not load custom icons, using default ones:', error);
        }
    }

    public updatePlayerKills(kills: number): void {
        this.playerStats.updateKills(kills);
    }

    public updatePlayerCash(cash: number): void {
        this.playerStats.updateCash(cash);
    }

    public updatePlayerStats(kills: number, cash: number): void {
        this.playerStats.updateStats({ kills, cash });
    }

    private updatePositions(): void {
        this.pingText.position.set(5, 3);
        this.scoreText.position.set(this.app.screen.width - 150, this.app.screen.height - 60);
        this.playerCountText.position.set(this.app.screen.width - 150, this.app.screen.height - 45);
    }

    public updateScore(score: number): void {
        this.scoreText.text = `Snake Length : ${Math.floor(score)}`;
    }

    public updateConnectionStatus(status: string): void {
        this.scoreText.text = status;
    }

    public updatePing(ping: number): void {
        this.pingText.text = `Ping: ${ping}ms`;

        if (ping < 50) {
            this.pingText.style.fill = 0x01B775;
        } else if (ping < 100) {
            this.pingText.style.fill = 0xD0AD29;
        } else {
            this.pingText.style.fill = 0xC54344;
        }
    }

    public updatePlayerCount(count: number): void {
        this.playerCountText.text = `Total Snakes : ${count}/50`;
    }

    public destroy(): void {
        if (this.playerStats) {
            this.playerStats.destroy();
        }

        if (this.killFeed) {
            this.killFeed.destroy();
        }
    }
}
