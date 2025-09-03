import { encode, decode } from '@msgpack/msgpack';

import { MessageType, GameStatePayload, JoinAcceptedPayload, PlayerDiedPayload , FoodSpawnedPayload,FoodEatenPayload, KillFeedPayload, PlayerJoinedPayLoad } from 'shared';

function serialize(type: MessageType, payload: any): Uint8Array {
    return encode([type, payload]);
}

export class NetworkManager {
    private ws: WebSocket | null = null;

    public onPlayerJoined: (payload: PlayerJoinedPayLoad) => void = () => { };

    public onPong: (payload: any) => void = () => { };

    public onStateUpdate: (payload: GameStatePayload) => void = () => { };
    public onJoinAccepted: (payload: JoinAcceptedPayload) => void = () => { };
    public onPlayerDied: (payload: PlayerDiedPayload) => void = () => { };
    public onFoodSpawned: (payload: FoodSpawnedPayload) => void = () => { };
    public onFoodEaten: (payload: FoodEatenPayload) => void = () => { };


    public onKillFeed?: (payload: KillFeedPayload) => void;
    public onDisconnect: () => void = () => { };

    public connect(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                console.log('Successfully connected to WebSocket server.');
                resolve();
            };

            this.ws.onmessage = (event: MessageEvent) => {
                try {
                    const [type, payload] = decode(event.data) as [MessageType, any];
                    this.handleMessage(type, payload);
                } catch (error) {
                    console.error("Failed to decode message:", error);
                }
            };

            this.ws.onclose = () => {
                console.log('Disconnected from server.');
                this.onDisconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                reject(error);
            };
        });
    }

    public sendCollisionReport(victimId: string, killerId: string) {
        if (this.isConnected()) {
            this.ws!.send(serialize(MessageType.C_S_COLLISION_REPORT, { victimId, killerId }));
        }
    }

    private handleMessage(type: MessageType, payload: any): void {
        switch (type) {
            case MessageType.S_C_JOIN_ACCEPTED:
                this.onJoinAccepted(payload);
                break;
            case MessageType.S_C_GAME_STATE:
                this.onStateUpdate(payload);
                break;
            case MessageType.S_C_PLAYER_DIED:
                this.onPlayerDied(payload);
                break;
            case MessageType.S_C_FOOD_SPAWNED:
                this.onFoodSpawned(payload);
                break;
            case MessageType.S_C_FOOD_EATEN:
                this.onFoodEaten(payload);
                break;

            case MessageType.S_C_PLAYER_JOINED:
                this.onPlayerJoined(payload);
                break;

            case MessageType.S_C_KILL_FEED:
                if (this.onKillFeed) {
                    this.onKillFeed(payload as KillFeedPayload);
                }
                break;

            case MessageType.S_C_PONG:
                this.onPong(payload);
                break;
        }
    }

    public sendPing() {
        if (this.isConnected()) {

            this.ws!.send(serialize(MessageType.C_S_PING, { time: Date.now() }));
        }
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public sendJoin(username: string, slitherAmount:number) {
        if (this.isConnected()) {
            console.log(`Starting the game with ${slitherAmount} sol`)
            this.ws!.send(serialize(MessageType.C_S_JOIN, { username:username, slitherAmount:slitherAmount }));
        }
    }

    public sendInput(targetAngle: number, isBoosting: boolean, sequence: number) {
        if (this.isConnected()) {
            this.ws!.send(serialize(MessageType.C_S_INPUT, { targetAngle, isBoosting, sequence }));
        }
    }

    public disconnect(): void {
        if (this.ws) {
            this.ws.close();
        }
    }
}