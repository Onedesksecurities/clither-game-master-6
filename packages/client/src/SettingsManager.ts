export type ControlMode = 'joystick' | 'pointer';

export interface GameSettings {
    controlMode: ControlMode;
    soundEnabled: boolean;
    musicEnabled: boolean;
}

export class SettingsManager {
    public settings: GameSettings;
    private storageKey = 'slitherCloneSettings';

    constructor() {
        this.settings = this.load();
    }

    private load(): GameSettings {
        const defaults: GameSettings = {
            controlMode: 'joystick',
            soundEnabled: true,
            musicEnabled: true,
        };

        try {
            const storedSettings = localStorage.getItem(this.storageKey);
            if (storedSettings) {
                return { ...defaults, ...JSON.parse(storedSettings) };
            }
        } catch (error) {
            console.error("Failed to load settings from localStorage", error);
        }
        return defaults;
    }

    public save(): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        } catch (error) {
            console.error("Failed to save settings to localStorage", error);
        }
    }

    public get<K extends keyof GameSettings>(key: K): GameSettings[K] {
        return this.settings[key];
    }

    public set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
        this.settings[key] = value;
        this.save();
        
        if (window.menuManager) {
            window.menuManager.updateUIFromSettings();
        }
    }
}