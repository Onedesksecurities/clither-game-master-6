import { SettingsManager } from './SettingsManager';

export class UIManager {
    private settingsManager: SettingsManager;
    private onPlay: (username: string) => void;
    private onToggleFullscreen: () => void;

    constructor(settingsManager: SettingsManager, onPlay: (username: string) => void, onToggleFullscreen: () => void) {
        this.settingsManager = settingsManager;
        this.onPlay = onPlay;
        this.onToggleFullscreen = onToggleFullscreen;
        
        this.updateUIFromSettings();
    }

    public updateUIFromSettings(): void {
        
        if (window.menuManager) {
            window.menuManager.updateUIFromSettings();
        }
    }

    public show(): void {
        if (window.showMenu) {
            window.showMenu();
        }
    }

    public hide(): void {
        if (window.hideMenu) {
            window.hideMenu();
        }
    }
}