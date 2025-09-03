import { Game } from './game/core/Game';
import { SettingsManager } from './SettingsManager';
import { UIManager } from './UIManager';

class AppManager {
    private settingsManager: SettingsManager;
    private uiManager: UIManager;
    private game: Game | null = null;
    private appElement: HTMLElement;
    private homeBtn: HTMLElement;
    private orientationWarning: HTMLElement;
    private enterGameBtn: HTMLElement;

    constructor() {
        this.appElement = document.getElementById('app')!;
        this.homeBtn = document.getElementById('home-btn')!;
        this.orientationWarning = document.getElementById('orientation-warning')!;
        this.enterGameBtn = document.getElementById('enter-game-btn')!;

        this.settingsManager = new SettingsManager();
        this.uiManager = new UIManager(this.settingsManager,
            (username: string, ) => this.startGame(username, 0.05),
            () => this.toggleFullscreen()
        );

        this.homeBtn.addEventListener('click', () => this.endGame());
        this.enterGameBtn.addEventListener('click', () => this.toggleFullscreen());

        this.checkOrientationAndFullscreen();
        window.addEventListener('resize', () => this.checkOrientationAndFullscreen());
        document.addEventListener('fullscreenchange', () => this.checkOrientationAndFullscreen());
    }

    private checkOrientationAndFullscreen(): void {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        const isFullscreen = !!document.fullscreenElement;

        if (isMobile && (!isLandscape || !isFullscreen)) {
            this.orientationWarning.style.display = 'flex';
        } else {
            this.orientationWarning.style.display = 'none';
        }
    }

    public startGame(username: string, slitherAmount: number): void {
        this.uiManager.hide();
        this.homeBtn.style.display = 'flex';

        this.game = new Game({
            settings: this.settingsManager.settings,
            onGameOver: () => this.endGame(),
            username: username
        });

        this.appElement.appendChild(this.game.getApp().view as HTMLCanvasElement);

        this.game.init(slitherAmount);
    }

    public endGame(): void {
        if (!this.game) return;

        this.homeBtn.style.display = 'none';

        const canvas = this.game.getApp().view as HTMLCanvasElement;
        canvas.style.transition = 'opacity 0.5s ease-in-out';
        canvas.style.opacity = '0';

        setTimeout(() => {
            if (this.game) {
                this.game.destroy();
                const gameCanvas = this.appElement.querySelector('canvas');
                if (gameCanvas) {
                    this.appElement.removeChild(gameCanvas);
                }
                this.game = null;
            }
            this.uiManager.show();
        }, 500);
    }

    public async toggleFullscreen(): Promise<void> {
        const docEl = document.documentElement;
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        try {
            if (!document.fullscreenElement) {
                await docEl.requestFullscreen();
                if (isMobile && window.screen.orientation && typeof window.screen.orientation.lock === 'function') {
                    
                    await window.screen.orientation.lock('landscape');
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.error("Fullscreen Error:", err);
        }
    }
}

(window as any).appManager = new AppManager();