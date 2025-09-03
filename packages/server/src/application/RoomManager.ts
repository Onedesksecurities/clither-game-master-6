
import { nanoid } from 'nanoid';
import { GameRoom, GameState } from '../core/GameRoom';
import { Player, Room } from '../types/AppTypes';
import { WebSocketManager } from '../network/WebSocketManager';
import { CollisionReportPayload, InitialStatePayload, InputPayload, MessageType, serialize, SnakeStateUpdate } from 'shared';
import { FoodType, SnakeSegment } from 'shared';

import { config } from 'shared';
import { Snake } from '../core/Snake';

function toClientSnake(s: Snake): SnakeStateUpdate {

    return {
        id: s.id,
        username: s.username,
        color: s.color,
        segments: s.segments.map((seg: SnakeSegment) => ({ x: seg.x, y: seg.y, angle: seg.angle })),
        length: Math.floor(s.segments.length),
        radius: s.radius,
        isBoosting: s.isBoosting,
        score: Math.floor(s.score),
        cash: s.cash,
        isSpectator: s.isSpectator
    };
}

export class RoomManager {
    private rooms: Map<string, Room> = new Map();
    public webSocketManager!: WebSocketManager;

    public setWebSocketManager(manager: WebSocketManager) {
        this.webSocketManager = manager;
    }

    public queuePlayerInput(roomId: string, playerId: string, input: InputPayload) {
        const room = this.rooms.get(roomId);
        if (room) {
            const snake = room.game.snakes.get(playerId);
            if (snake) {
                snake.pendingInputs.push(input);
            }
        }
    }

    public removePlayerFromRoom(playerId: string, roomId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.game.removePlayer(playerId);
            room.players.delete(playerId);

            if (room.players.size === 0 && room.game.snakes.size === 0) {
                this.rooms.delete(roomId);
                console.log(`Room ${roomId} closed as it's empty.`);
            }
        }
    }

    public assignPlayerToRoom(player: Player, slitherAmount: number): void {
        let targetRoom = this.findAvailableRoom();
        if (!targetRoom) {
            targetRoom = this.createRoom();
        }

        player.roomId = targetRoom.id;

        const existingPlayers = new Map(targetRoom.players);

        console.log(slitherAmount)
        targetRoom.players.set(player.id, player);

        targetRoom.game.addPlayer(player, slitherAmount)
            .then(() => {
                const newPlayerSnake = targetRoom.game.snakes.get(player.id)!;
                const spawnPoint = newPlayerSnake.getHead();

                const nearbyFoods = targetRoom.game.foodManager.foodQuadtree.query({
                    x: spawnPoint.x,
                    y: spawnPoint.y,
                    width: config.food.FOOD_RADIUS_OF_INTEREST,
                    height: config.food.FOOD_RADIUS_OF_INTEREST,
                }) as FoodType[];

                for (const food of nearbyFoods) {
                    newPlayerSnake.knownFood.add(food.id);
                }

                if (existingPlayers.size > 0) {
                    const playerJoinedMsg = serialize(MessageType.S_C_PLAYER_JOINED, { snake: toClientSnake(newPlayerSnake) });
                    this.webSocketManager.broadcast(existingPlayers, playerJoinedMsg);
                }

                const allSnakesForState = Array.from(targetRoom.game.snakes.values());
                const initialState: InitialStatePayload = {
                    snakes: allSnakesForState.map(toClientSnake),
                    foods: nearbyFoods,
                    leaderboard: [],
                    lastProcessedInput: Object.fromEntries(allSnakesForState.map((s:Snake) => [s.id, s.lastProcessedInput]))
                };

                const joinAcceptedMsg = serialize(MessageType.S_C_JOIN_ACCEPTED, {
                    playerId: player.id,
                    initialState,
                    color: newPlayerSnake.color,
                    cash: newPlayerSnake.cash
                });
                this.webSocketManager.send(player.id, joinAcceptedMsg);
            })
            .catch((err: any) => {
                console.error("Error adding player:", err);
            });

    }

    private findAvailableRoom(): Room | undefined {
        for (const room of this.rooms.values()) {
            if (room.players.size < config.MAX_PLAYERS_PER_ROOM) {
                return room;
            }
        }
        return undefined;
    }

    private createRoom(): Room {
        const game = new GameRoom();
        const roomId = nanoid();

        game.webSocketManager = this.webSocketManager;

        const room: Room = {
            id: roomId,
            players: new Map(),
            game,
        };

        game.onPlayerDied = (player:Player, deathFoods:FoodType[]) => {
            const diedMsg = serialize(MessageType.S_C_PLAYER_DIED, {
                playerId: player.id,
                deathFoods: deathFoods
            });

            this.webSocketManager.broadcast(room.players, diedMsg, 'high');
        };

        this.rooms.set(roomId, room);
        console.log(`Room ${roomId} created.`);
        return room;
    }

    public queueCollisionReport(roomId: string, payload: CollisionReportPayload) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.game.processCollisionReport(payload.victimId, payload.killerId);
        }
    }

    public tickRooms(deltaTime: number) {
        const roomsToDelete: string[] = [];

        for (const [roomId, room] of this.rooms.entries()) {
            const gameStatePayload = room.game.tick(deltaTime);

            if (gameStatePayload && room.players.size > 0) {
                const msg = serialize(MessageType.S_C_GAME_STATE, gameStatePayload);
                this.webSocketManager.broadcast(room.players, msg);
            }

            if (room.players.size === 0 && room.game.snakes.size === 0) {
                roomsToDelete.push(roomId);
            }
        }

        for (const roomId of roomsToDelete) {
            this.rooms.delete(roomId);
            console.log(`Room ${roomId} cleaned up during tick.`);
        }
    }
}