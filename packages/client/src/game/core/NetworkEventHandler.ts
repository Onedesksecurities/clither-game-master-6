import { GameStatePayload, JoinAcceptedPayload, FoodSpawnedPayload, FoodEatenPayload, KillFeedPayload, PlayerJoinedPayLoad, SnakeStateUpdate, CompactSnakeStateUpdate } from 'shared';
import { GameState } from './GameState';
import { FoodManager } from '../food/FoodManager';
import { GameUI } from './GameUI';
import { SnakeV2 } from '../snake/SnakeV2';

import { Leaderboard } from './Leaderboard';
import { Minimap } from './Minimap';
import * as PIXI from 'pixi.js';

export class NetworkEventHandler {
    private gameState: GameState;
    private foodManager: FoodManager;
    private gameUI: GameUI;
    private snakeContainer: PIXI.Container;
    private app: PIXI.Application;
    private onLocalPlayerDied: () => void;
    private leaderboard: Leaderboard;
    private minimap: Minimap;

    constructor(
        gameState: GameState,
        foodManager: FoodManager,
        gameUI: GameUI,
        snakeContainer: PIXI.Container,
        app: PIXI.Application,
        minimap: Minimap,
        leaderboard: Leaderboard,
        onLocalPlayerDied: () => void
    ) {
        this.gameState = gameState;
        this.foodManager = foodManager;
        this.gameUI = gameUI;
        this.snakeContainer = snakeContainer;
        this.app = app;
        this.minimap = minimap;
        this.leaderboard = leaderboard;
        this.onLocalPlayerDied = onLocalPlayerDied;
    }

    public handleKillFeed(payload: KillFeedPayload): void {
        console.log(`Kill feed: ${payload.killerName} killed ${payload.victimName} (${payload.method})`);

        if (this.gameUI && this.gameUI.getKillFeed()) {
            this.gameUI.addKillToFeed(
                payload.killerName,
                payload.victimName,
                payload.method,
                payload.cash);
        }
    }

    public handleJoinAccepted(payload: JoinAcceptedPayload): void {
        if (this.gameState.isGameOver) return;

        this.gameState.setStartingAmount(payload.startingAmount);
        this.gameState.myPlayerId = payload.playerId;
        this.foodManager.initializeFromServer(payload.initialState.foods);

        payload.initialState.snakes.forEach((serverSnake: SnakeStateUpdate) => {
            if (!serverSnake.segments || serverSnake.segments.length === 0) {
                console.error("Received snake data without segments:", serverSnake);
                return;
            }

            const isMe = serverSnake.id === this.gameState.myPlayerId;
            const snakeColor = isMe ? payload.color : serverSnake.color;

            const snake = new SnakeV2(
                0, 0,
                [snakeColor],
                this.app.renderer as PIXI.Renderer,
                serverSnake.username,
                serverSnake
            );

            snake.id = serverSnake.id;
            snake.getContainer().zIndex = isMe ? 100 : 10;

            snake.initializeFromServerData(serverSnake);

            if (isMe) {
                this.gameState.playerSnake = snake;
                console.log(`Local player snake initialized with ${snake.getLength()} segments`);
            } else {
                this.gameState.otherSnakes.set(serverSnake.id, snake);
                console.log(`Remote snake ${serverSnake.username} initialized with ${snake.getLength()} segments`);
            }

            this.snakeContainer.addChild(snake.getContainer());
        });
    }

    public handleStateUpdate(state: GameStatePayload): void {
        const serverIds = new Set(state.snakes.map(s => s.id));
        this.gameState.totalPlayers = state.totalPlayer;

        for (const [id, snake] of this.gameState.otherSnakes.entries()) {
            if (!serverIds.has(id) && !snake.isDying) {
                snake.destroy();
                this.gameState.otherSnakes.delete(id);
            }
        }

        state.snakes.forEach(serverSnake => {
            if (serverSnake.id === this.gameState.myPlayerId) {
                this.updatePlayerSnake(serverSnake, state);
                this.gameUI.updatePlayerCash(serverSnake.cash)
            } else {
                this.updateOtherSnake(serverSnake);
            }
        });

        if (state.leaderboard && state.leaderboard.length > 0) {
            const playerUsername = this.gameState.playerSnake?.username;
            this.leaderboard.updateLeaderboard(state.leaderboard, playerUsername);
        }

        if (state.minimap) {
            const playerPosition = this.gameState.playerSnake ?
                this.gameState.playerSnake.getHeadPosition() : undefined;

            if (this.minimap) {
                this.minimap.updateMinimap({
                    grid: state.minimap.grid,
                    playerPosition
                });
            }
        }

        if (!this.gameState.isGameOver && this.gameState.playerSnake) {
            this.gameUI.updateScore(this.gameState.playerSnake.getScore());
        }
    }

    private updatePlayerSnake(serverSnake: any, state: GameStatePayload): void {
        if (!this.gameState.isGameOver && this.gameState.playerSnake) {
            this.gameState.playerSnake.setScore(serverSnake.score);
            this.gameState.playerSnake.snakeRelease();
            this.gameState.playerSnake.setTrueLength(serverSnake.length);
            this.gameState.playerSnake.updateBoostState(serverSnake.isBoosting);

            const serverHead = serverSnake.head;
            this.gameState.playerSnake.setServerAuthoritativeState(serverHead);

            this.gameState.filterPendingInputs(state.lastProcessedInput[this.gameState.myPlayerId!] || 0);

            this.gameState.getPendingInputs().forEach(input => {
                this.gameState.playerSnake.applyInput(input);
            });
        }
    }

    private updateOtherSnake(serverSnake: CompactSnakeStateUpdate): void {
        let snakeToUpdate = this.gameState.otherSnakes.get(serverSnake.id);


        if (snakeToUpdate) {
            snakeToUpdate.setServerState(serverSnake);
            if (!snakeToUpdate.isDying) {
                snakeToUpdate.snakeRelease();
            }
            snakeToUpdate.addStateToBuffer({ time: Date.now(), head: serverSnake.head });
            snakeToUpdate.setTrueLength(serverSnake.length);
            snakeToUpdate.updateBoostState(serverSnake.isBoosting);
            snakeToUpdate.setScore(serverSnake.score);
        }
    }

    public handlePlayerDied({ playerId, deathFoods }: { playerId: string; deathFoods: any[] }): void {
        console.log(`Server confirmed death of ${playerId}`);

        const reportsToRemove: string[] = [];
        for (const [reportId, report] of this.gameState.getCollisionReports()) {
            if (report.victimId === playerId) {
                reportsToRemove.push(reportId);
            }
        }
        reportsToRemove.forEach(id => this.gameState.removeCollisionReport(id));

        this.gameState.removeRollbackState(playerId);

        if (deathFoods) {
            this.foodManager.spawnDeathFoods(deathFoods);
        }

        if (playerId === this.gameState.myPlayerId) {
            this.onLocalPlayerDied();
        } else {
            const deadSnake = this.gameState.otherSnakes.get(playerId);
            if (deadSnake) {
                if (!deadSnake.collided) {
                    deadSnake.snakeCollided();
                }
                deadSnake.startDeathAnimation(() => {
                    deadSnake.destroy();
                    this.gameState.otherSnakes.delete(playerId);
                });
            }
        }
    }

    public handlePlayerJoined(payload: PlayerJoinedPayLoad): void {
        const serverSnake = payload.snake;
        if (this.gameState.isGameOver || this.gameState.otherSnakes.has(serverSnake.id)) return;
        if (!serverSnake.segments || serverSnake.segments.length === 0) {
            console.error("Received new player data without segments:", serverSnake);
            return;
        }

        console.log(`Player ${serverSnake.username} joined the game.`);

        const newSnake = new SnakeV2(
            0, 0,
            [serverSnake.color],
            this.app.renderer as PIXI.Renderer,
            serverSnake.username,
            serverSnake
        );
        newSnake.id = serverSnake.id;

        newSnake.initializeFromServerData(serverSnake);

        this.gameState.otherSnakes.set(serverSnake.id, newSnake);
        this.snakeContainer.addChild(newSnake.getContainer());

        console.log(`New player ${serverSnake.username} initialized with ${newSnake.getLength()} segments`);
    }

    public handleFoodSpawned(payload: FoodSpawnedPayload): void {
        if (this.gameState.isGameOver) return;
        payload.foods.forEach(food => this.foodManager.spawnNewFood(food));
    }

    public handleFoodEaten(payload: FoodEatenPayload): void {
        if (this.gameState.isGameOver) return;
        this.foodManager.removeFoods(payload.foodIds);
    }

    public handleDisconnect(): void {
        if (this.gameState.isGameOver) return;
        this.gameUI.updateConnectionStatus("Disconnected");
    }

    public handlePong(payload: { time: number }): void {
        this.gameState.ping = Math.round((Date.now() - payload.time) / 2);
        this.gameUI.updatePing(this.gameState.ping);
        this.gameUI.updatePlayerCount(this.gameState.totalPlayers)
    }
}