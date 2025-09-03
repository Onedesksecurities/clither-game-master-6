import { RoomManager } from './application/RoomManager';
import { WebSocketManager } from './network/WebSocketManager';

import { config } from 'shared';

class GameServer {
    
    private roomManager: RoomManager;
    private webSocketManager: WebSocketManager;
    private lastTick: number;

    constructor() {
        this.roomManager = new RoomManager();
        this.webSocketManager = new WebSocketManager(this.roomManager);
        this.roomManager.setWebSocketManager(this.webSocketManager);
        this.lastTick = Date.now();
    }

    public start(): void {
        setInterval(() => this.tick(), 1000 / config.TICK_RATE);
    }

    private tick(): void {
        const now = Date.now();
        const deltaTime = (now - this.lastTick) / (1000 / 60); 
        this.lastTick = now;

        this.roomManager.tickRooms(deltaTime);
    }
}

const server = new GameServer();
server.start();