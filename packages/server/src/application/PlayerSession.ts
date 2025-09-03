
import WebSocket from "ws";

export class PlayerSession {
    public readonly id: string;
    public username: string;
    public ws: WebSocket;
    public roomId: string | null = null;
    public isAlive: boolean = true;
    public deathTime?: number;
    
    public isSending: boolean = false;
    public messageQueue: Buffer[] = [];

    constructor(id: string, ws: WebSocket) {
        this.id = id;
        this.ws = ws;
        this.username = 'Anonymous';
        this.isAlive = true;
    }

    public markDead(): void {
        this.isAlive = false;
        this.deathTime = Date.now();
    }

    public markAlive(): void {
        this.isAlive = true;
        delete this.deathTime;
    }
}