class MenuManager {
    constructor() {
        this.menuScreen = null;
        this.usernameInput = null;
        this.playButton = null;
        this.soundControl = null;
        this.musicControl = null;
        this.controlMode = null;
        this.settingsManager = null;
        this.modal = null;
        this.amountInput = null;
        this.lengthValue = null;
        this.snakeBody = null;
        this.goBackBtn = null;
        this.topUpPlayBtn = null;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        this.setupElements();
        this.setupEventListeners();
        
        this.waitForAppManager();
    }
    
    waitForAppManager() {
        if (window.appManager && window.appManager.settingsManager) {
            this.settingsManager = window.appManager.settingsManager;
            this.updateUIFromSettings();
        } else {
            setTimeout(() => this.waitForAppManager(), 100);
        }
    }
    
    setupElements() {
        this.menuScreen = document.getElementById('menu-screen');
        this.usernameInput = document.getElementById('username-input');
        this.playButton = document.getElementById('play-button');
        this.soundControl = document.getElementById('sound-control');
        this.musicControl = document.getElementById('music-control');
        this.controlMode = document.getElementById('control-mode');
        
        this.modal = document.getElementById('classic-battle-modal');
        this.amountInput = document.getElementById('amount-input');
        this.lengthValue = document.getElementById('length-value');
        this.snakeBody = document.getElementById('snake-body');
        this.goBackBtn = document.getElementById('go-back-btn');
        this.topUpPlayBtn = document.getElementById('top-up-play-btn');
        
        const savedUsername = localStorage.getItem('slitherCloneUsername') || '';
        if (this.usernameInput) {
            this.usernameInput.value = savedUsername;
        }
    }
    
    setupEventListeners() {
        
        if (this.playButton) {
            // MODIFIED: Instead of showing the modal, we now start the game directly.
            this.playButton.addEventListener('click', () => this.startGameNow());
        }
        
        if (this.usernameInput) {
            this.usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    // MODIFIED: Start the game on Enter key press instead of showing the modal.
                    this.startGameNow();
                }
            });
        }
        
        if (this.soundControl) {
            this.soundControl.addEventListener('click', () => this.toggleSound());
        }
        
        if (this.musicControl) {
            this.musicControl.addEventListener('click', () => this.toggleMusic());
        }
        
        if (this.controlMode) {
            this.controlMode.addEventListener('click', () => this.toggleControlMode());
        }
        
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                this.amountInput.value = amount;
                this.updateSnakeLength(amount);
            });
        });
        
        if (this.amountInput) {
            this.amountInput.addEventListener('input', (e) => {
                const value = e.target.value;
                if (this.validateAmount(value)) {
                    this.updateSnakeLength(value);
                } else {
                    
                }
            });
        }
        
        if (this.goBackBtn) {
            this.goBackBtn.addEventListener('click', () => this.hideModal());
        }
        
        if (this.topUpPlayBtn) {
            this.topUpPlayBtn.addEventListener('click', () => {
                const amount = this.amountInput.value;
                if (this.validateAmount(amount)) {
                    this.hideModal();
                    const username = this.usernameInput.value.trim() || 'Anonymous';
                    localStorage.setItem('slitherCloneUsername', username);
                    window.appManager.startGame(username, amount);
                } else {
                    
                    alert('Please enter a valid amount between 0.005 and 1 Sol');
                }
            });
        }
    }

    // ADDED: A new function to handle starting the game directly.
    startGameNow() {
        const username = this.usernameInput.value.trim() || 'Anonymous';
        const amount = '0.05'; // Set to the default value of 0.05
        localStorage.setItem('slitherCloneUsername', username);
        window.appManager.startGame(username, amount);
    }
    
    toggleSound() {
        if (!this.settingsManager) return;
        
        const currentSound = this.settingsManager.get('soundEnabled');
        this.settingsManager.set('soundEnabled', !currentSound);
        this.updateSoundUI(!currentSound);
    }
    
    toggleMusic() {
        if (!this.settingsManager) return;
        
        const currentMusic = this.settingsManager.get('musicEnabled');
        this.settingsManager.set('musicEnabled', !currentMusic);
        this.updateMusicUI(!currentMusic);
    }
    
    toggleControlMode() {
        if (!this.settingsManager) return;
        
        const currentMode = this.settingsManager.get('controlMode');
        const newMode = currentMode === 'pointer' ? 'joystick' : 'pointer';
        this.settingsManager.set('controlMode', newMode);
        this.updateControlModeUI(newMode);
    }
    
    updateUIFromSettings() {
        if (!this.settingsManager) return;
        
        const soundEnabled = this.settingsManager.get('soundEnabled');
        const musicEnabled = this.settingsManager.get('musicEnabled');
        const controlMode = this.settingsManager.get('controlMode');
        
        this.updateSoundUI(soundEnabled);
        this.updateMusicUI(musicEnabled);
        this.updateControlModeUI(controlMode);
    }
    
    updateSoundUI(enabled) {
        const soundIcon = document.getElementById('sound-icon');
        const soundIconContainer = document.getElementById('sound-icon-container');
        
        if (soundIcon && soundIconContainer) {
            if (enabled) {
                soundIcon.classList.remove('disabled');
                soundIconContainer.classList.remove('disabled');
            } else {
                soundIcon.classList.add('disabled');
                soundIconContainer.classList.add('disabled');
            }
        }
    }
    
    updateMusicUI(enabled) {
        const musicIcon = document.getElementById('music-icon');
        const musicIconContainer = document.getElementById('music-icon-container');
        
        if (musicIcon && musicIconContainer) {
            if (enabled) {
                musicIcon.classList.remove('disabled');
                musicIconContainer.classList.remove('disabled');
            } else {
                musicIcon.classList.add('disabled');
                musicIconContainer.classList.add('disabled');
            }
        }
    }
    
    updateControlModeUI(mode) {
        const controlIcon = document.getElementById('control-icon');
        const controlTitle = document.getElementById('control-title');
        const controlHint = document.getElementById('control-hint');
        
        if (controlIcon && controlTitle && controlHint) {
            if (mode === 'pointer') {
                controlIcon.src = './assets/res/ic_pointer.svg';
                controlTitle.textContent = 'Pointer';
                controlHint.innerHTML = 'Recommended<br>for PC';
            } else {
                controlIcon.src = './assets/res/ic_dpad.svg';
                controlTitle.textContent = 'Dragger';
                controlHint.innerHTML = 'Recommended<br>for Mobile';
            }
        }
    }
    
    show() {
        if (this.menuScreen) {
            this.menuScreen.classList.remove('hidden');
        }
    }
    
    hide() {
        if (this.menuScreen) {
            this.menuScreen.classList.add('hidden');
        }
    }
    
    showModal() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
        }
    }
    
    hideModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.amountInput.value = '';
            this.updateSnakeLength(0);
        }
    }
    
    validateAmount(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0.005 && num <= 1;
    }
    
    updateSnakeLength(value) {
        const num = parseFloat(value) || 0;
        const length = Math.round(num * 1000); 
        this.lengthValue.textContent = length;
        this.snakeBody.style.width = `${Math.max(50, num * 200)}px`; 
    }
}

window.menuManager = new MenuManager();

window.showMenu = function() {
    if (window.menuManager) {
        window.menuManager.show();
    }
};

window.hideMenu = function() {
    if (window.menuManager) {
        window.menuManager.hide();
    }
};