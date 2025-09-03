
import WebSocket, { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { Player } from '../types/AppTypes';
import { deserialize } from 'shared';
import { MessageHandler } from './MessageHandler';

import { config } from 'shared';
import { RoomManager } from '../application/RoomManager';

export class WebSocketManager {
    private wss: WebSocketServer;
    public players: Map<string, Player> = new Map();
    private messageHandler: MessageHandler;
    private roomManager: RoomManager;

    constructor(roomManager: RoomManager) {
        this.wss = new WebSocketServer({ port: config.PORT });
        this.messageHandler = new MessageHandler(roomManager);
        this.roomManager = roomManager;
        this.setupListeners();
        console.log(`🚀 WebSocket server started on port ${config.PORT}`);
    }

    private setupListeners(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            const playerId = nanoid();
            const player: Player = {
                id: playerId, 
                ws, 
                username: 'Anonymous', 
                roomId: null,
                isSending: false,
                messageQueue: [],
                isAlive: true 
            };
            this.players.set(playerId, player);
            console.log(`Player ${playerId} connected.`);

            ws.on('message', (data: Buffer) => {
                try {
                    const [type, payload] = deserialize(data);
                    this.messageHandler.handle(player, type, payload);
                } catch (error) {
                    console.error(`Error handling message from player ${playerId}:`, error);
                }
            });

            ws.on('close', () => {
                console.log(`Player ${playerId} disconnected.`);
                if (player.roomId) {
                    this.roomManager.removePlayerFromRoom(player.id, player.roomId);
                }
                this.players.delete(playerId);
            });

            ws.on('error', (error) => {
                console.error(`Error with player ${playerId}:`, error);
                ws.close();
            });
        });
    }

    public send(playerId: string, message: Buffer, priority: 'high' | 'normal' = 'normal'): void {
        const player = this.players.get(playerId);
        if (player && player.ws.readyState === WebSocket.OPEN) {
            
            if (priority === 'high') {
                player.messageQueue.unshift(message);
            } else {
                player.messageQueue.push(message);
            }
            this.processQueue(playerId);
        }
    }

    public broadcast(roomPlayers: Map<string, Player>, message: Buffer, priority: 'high' | 'normal' = 'normal'): void {
        
        const alivePlayers = Array.from(roomPlayers.values());
        
        for (const player of alivePlayers) {
            this.send(player.id, message, priority);
        }
    }

    private processQueue(playerId: string): void {
        const player = this.players.get(playerId);

        if (!player || player.isSending || player.messageQueue.length === 0) {
            return;
        }

        if (player.ws.readyState !== WebSocket.OPEN) {
            player.messageQueue.length = 0; 
            return;
        }

        player.isSending = true;
        const message = player.messageQueue.shift()!;

        player.ws.send(message, (err) => {
            player.isSending = false;

            if (err) {
                console.error(`Error sending message to player ${playerId}:`, err);
                
                player.messageQueue.length = 0;
            } else {
                
                this.processQueue(playerId);
            }
        });
    }

    public markPlayerDead(playerId: string): void {
        const player = this.players.get(playerId);
        if (player) {
            player.isAlive = false;
            player.deathTime = Date.now();
        }
    }

    public markPlayerAlive(playerId: string): void {
        const player = this.players.get(playerId);
        if (player) {
            player.isAlive = true;
            delete player.deathTime;
        }
    }

    public getAlivePlayerCount(): number {
        return Array.from(this.players.values()).filter(p => p.isAlive).length;
    }
}