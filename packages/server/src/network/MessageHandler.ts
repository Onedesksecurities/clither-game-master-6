import { RoomManager } from "../application/RoomManager";
import { Player } from "../types/AppTypes";
import { CollisionReportPayload, InputPayload, JoinPayload, MessageType, serialize } from "shared";

export class MessageHandler {
    private roomManager: RoomManager;

    constructor(roomManager: RoomManager) {
        this.roomManager = roomManager;
    }

    public handle(player: Player, messageType: MessageType, payload: any): void {
        switch (messageType) {
            case MessageType.C_S_JOIN:
                this.handleJoin(player, payload as JoinPayload);
                break;

            case MessageType.C_S_INPUT:
                this.handleInput(player, payload as InputPayload);
                break;

            case MessageType.C_S_COLLISION_REPORT:
                this.handleCollisionReport(player, payload as CollisionReportPayload);
                break;

            case MessageType.C_S_PING:
                
                this.roomManager.webSocketManager.send(player.id, serialize(MessageType.S_C_PONG, payload), 'high');
                break;
        }
    }

    private handleCollisionReport(player: Player, payload: CollisionReportPayload): void {
        if (player.roomId) {
            this.roomManager.queueCollisionReport(player.roomId, payload);
        }
    }

    private handleJoin(player: Player, { username, slitherAmount }: JoinPayload): void {
        player.username = username;
        console.log(slitherAmount)
        this.roomManager.assignPlayerToRoom(player, slitherAmount);
    }

    private handleInput(player: Player, payload: InputPayload): void {
        if (player.roomId) {
            this.roomManager.queuePlayerInput(player.roomId, player.id, payload);
        }
    }
}