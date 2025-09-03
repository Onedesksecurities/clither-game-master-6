
import WebSocket from 'ws';
import { GameRoom } from '../core/GameRoom';

export interface Player {
    id: string;
    username: string;
    ws: WebSocket;
    roomId: string | null;
    
    isSending: boolean;
    messageQueue: Buffer[];
    
    isAlive: boolean;
    deathTime?: number; 

    isSpectator?: boolean
}

export interface Room {
    id: string;
    players: Map<string, Player>;
    game: GameRoom;
}

export interface MinimapData {
    grid: boolean[][]; 
}