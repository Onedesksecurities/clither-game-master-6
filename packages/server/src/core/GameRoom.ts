import { CompactSnakeStateUpdate, config } from 'shared';
import { Player } from '../types/AppTypes';
import { FoodType, Vector2, SnakeSegment } from 'shared';
import { Quadtree } from 'shared';
import { CollisionDetector, SnakeCollisionResult, WallCollisionResult } from './Collision';
import { FoodManager } from './FoodManager';
import { Snake } from './Snake';
import { InputPayload, MessageType, serialize, GameStatePayload, KillFeedPayload } from 'shared';
import { PriceService } from '../services/PriceService';

import { CashDistribution } from './CashDistributionResult.js'

function toClientSnakeCompact(s: Snake): CompactSnakeStateUpdate {
    const head = s.getHead();
    return {
        id: s.id,
        username: s.username,
        color: s.color,
        head: { x: head.x, y: head.y, angle: s.getCurrentAngle() },
        length: Math.floor(s.length),
        radius: s.radius,
        isBoosting: s.isBoosting,
        score: Math.floor(s.score),
        cash: s.cashUSD,
        isSpectator: s.isSpectator
    };
}

export interface GameState {
    snakes: Snake[];
    foods: FoodType[];
    leaderboard: { id: string, username: string, score: number }[];
    lastProcessedInput: { [playerId: string]: number };
}

type CollisionVote = {
    killerId: string;
    reportedAt: number;
};

export interface WebSocketManagerInterface {
    send(playerId: string, message: Buffer, priority?: 'high' | 'normal'): void;
    broadcast(roomPlayers: Map<string, any>, message: Buffer, priority?: 'high' | 'normal'): void;
    players: Map<string, any>;
    markPlayerDead(playerId: string): void;
    markPlayerAlive(playerId: string): void;
    getAlivePlayerCount(): number;
}

export class GameRoom {
    public snakes: Map<string, Snake> = new Map();
    public foodManager: FoodManager;
    private collisionDetector: CollisionDetector;
    private snakeSegmentQuadtree: Quadtree;
    public onStateChange: (state: GameState) => void = () => { };
    public onPlayerDied: (player: Player, deathFoods: FoodType[]) => void = () => { };
    public webSocketManager: WebSocketManagerInterface;

    private foodCheckTimer: number = 0;
    private readonly FOOD_CHECK_INTERVAL = 1000;

    private pendingCollisions: Map<string, CollisionVote> = new Map();
    private readonly COLLISION_VOTE_TIMEOUT_MS = 150;

    private previousSnakeSegments: Map<string, SnakeSegment[]> = new Map();
    private aliveSnakes: Map<string, Snake> = new Map();

    private deadSnakesThisTick: Set<string> = new Set();

    private minimapGrid: boolean[][] = [];
    private minimapUpdateTimer: number = 0;
    private readonly MINIMAP_UPDATE_INTERVAL = 3000;
    private readonly MINIMAP_GRID_SIZE = 40;

    private playerKills: Map<string, number> = new Map();
    private playerCash: Map<string, number> = new Map();

    private priceService: PriceService = PriceService.getInstance();

    constructor() {
        this.foodManager = new FoodManager();
        this.collisionDetector = new CollisionDetector();
        const boundary = {
            x: 0, y: 0,
            width: config.WORLD_RADIUS,
            height: config.WORLD_RADIUS
        };
        this.snakeSegmentQuadtree = new Quadtree(boundary, 20);
        this.initializeMinimapGrid();
    }

    private updateMinimapGrid(): void {

        for (let x = 0; x < this.MINIMAP_GRID_SIZE; x++) {
            for (let y = 0; y < this.MINIMAP_GRID_SIZE; y++) {
                this.minimapGrid[x][y] = false;
            }
        }

        for (const snake of this.aliveSnakes.values()) {
            for (const segment of snake.segments) {
                const gridPos = this.worldToGridPosition(segment.x, segment.y);
                if (this.isValidGridPosition(gridPos.x, gridPos.y)) {
                    this.minimapGrid[gridPos.x][gridPos.y] = true;
                }
            }
        }
    }

    private worldToGridPosition(worldX: number, worldY: number): { x: number; y: number } {

        const normalizedX = (worldX + config.WORLD_RADIUS) / (2 * config.WORLD_RADIUS);
        const normalizedY = (worldY + config.WORLD_RADIUS) / (2 * config.WORLD_RADIUS);

        const gridX = Math.floor(normalizedX * this.MINIMAP_GRID_SIZE);
        const gridY = Math.floor(normalizedY * this.MINIMAP_GRID_SIZE);

        return { x: gridX, y: gridY };
    }

    private isValidGridPosition(x: number, y: number): boolean {
        return x >= 0 && x < this.MINIMAP_GRID_SIZE && y >= 0 && y < this.MINIMAP_GRID_SIZE;
    }

    private initializeMinimapGrid(): void {
        this.minimapGrid = Array(this.MINIMAP_GRID_SIZE).fill(null)
            .map(() => Array(this.MINIMAP_GRID_SIZE).fill(false));
    }

    public async addPlayer(player: Player, slitherAmount: number): Promise<void> {
        const solUSDRate = await this.priceService.getCurrentSOLUSD();
        const cashUSD = slitherAmount * solUSDRate;

        player.cashUSD = cashUSD;
        player.entryAmountSOL = slitherAmount;
        player.entryUSDRate = solUSDRate;
        player.kills = 0;


        const startPos = this.getSafeSpawnPoint();


        const snake = new Snake(player, startPos, {
            cashUSD,
            slitherAmount,
            usdRate: solUSDRate,
            isSpectator: config.spectatorMode.isOn && config.spectatorMode.username === player.username
        });

        console.log(snake.isSpectator)

        this.snakes.set(player.id, snake);
        this.aliveSnakes.set(player.id, snake);

        player.isAlive = true;
        delete player.deathTime;

        this.previousSnakeSegments.set(player.id, snake.getSegmentsCopy());
    }

    public removePlayer(playerId: string): void {
        this.snakes.delete(playerId);
        this.aliveSnakes.delete(playerId);
        this.previousSnakeSegments.delete(playerId);
        this.deadSnakesThisTick.add(playerId);
    }

    public processCollisionReport(victimId: string, killerId: string): void {

        const victim = this.aliveSnakes.get(victimId);
        if (!victim) {
            return;
        }

        if (victimId === killerId) {

            console.log(`[CLIENT WALL COLLISION] Player ${victimId} reported wall collision - IMMEDIATE DEATH`);
            this.confirmAndProcessDeath(victimId, "Wall collision (client-reported)");
            return;
        }

        const killer = this.aliveSnakes.get(killerId);
        if (killer) {
            console.log(`[CLIENT SNAKE COLLISION] Player ${victimId} died to ${killer.username} - IMMEDIATE DEATH`);
            this.confirmAndProcessDeath(victimId, `Collision with ${killer.username} (client-reported)`, killerId);
        } else {

            console.log(`[CLIENT SNAKE COLLISION] Player ${victimId} died to unknown/dead player ${killerId} - IMMEDIATE DEATH`);
            this.confirmAndProcessDeath(victimId, `Collision with player ${killerId} (client-reported)`, killerId);
        }
    }

    private confirmAndProcessDeath(victimId: string, reason: string, killerId?: string): void {
        const victim = this.aliveSnakes.get(victimId);
        if (!victim) return;

        console.log(`[SERVER DEATH WITH CASH] Player: ${victim.username} (${victim.id}). Reason: ${reason}`);

        let killer: Snake | null = null;
        if (killerId && killerId !== victimId) {
            killer = this.aliveSnakes.get(killerId) || null;
        }

        const distribution = CashDistribution.distributeDeathCash(victim, killer, this.aliveSnakes);

        this.broadcastKillFeed({
            killerName: killer ? killer.username : "Arena Wall",
            victimName: victim.username,
            method: killer ? 'snake' : 'wall',
            cash: distribution.killerReward > 0 ? distribution.killerReward :
                distribution.nearestReward > 0 ? distribution.nearestReward : undefined,
            timestamp: Date.now()
        });

        this.aliveSnakes.delete(victimId);
        this.deadSnakesThisTick.add(victimId);

        const deathFoods = this.foodManager.spawnDeathFood(victim);
        this.onPlayerDied({ id: victim.id, username: victim.username } as Player, deathFoods);

        this.removePlayer(victimId);
    }

    private broadcastKillFeed(killFeedData: KillFeedPayload): void {
        if (!this.webSocketManager) return;
        const killFeedMsg = serialize(MessageType.S_C_KILL_FEED, killFeedData);

        const allRoomPlayers = new Map<string, Player>();

        for (const snake of this.aliveSnakes.values()) {
            const player = this.webSocketManager.players.get(snake.id);
            if (player) {
                allRoomPlayers.set(snake.id, player);
            }
        }

        for (const snake of this.snakes.values()) {
            if (!this.aliveSnakes.has(snake.id)) {
                const player = this.webSocketManager.players.get(snake.id);
                if (player) {
                    allRoomPlayers.set(snake.id, player);
                }
            }
        }

        this.webSocketManager.broadcast(allRoomPlayers, killFeedMsg, 'high');
    }

    public getPlayerStats(playerId: string): { kills: number; cash: number } {
        return {
            kills: this.playerKills.get(playerId) || 0,
            cash: this.playerCash.get(playerId) || 0
        };
    }

    private cleanupExpiredCollisionVotes(): void {
        const now = Date.now();
        for (const [victimId, vote] of this.pendingCollisions.entries()) {
            if (now - vote.reportedAt > this.COLLISION_VOTE_TIMEOUT_MS) {
                this.pendingCollisions.delete(victimId);
            }
        }
    }

    public tick(deltaTime: number): GameStatePayload | null {

        this.deadSnakesThisTick.clear();

        this.minimapUpdateTimer -= deltaTime * (1000 / 60);

        const allSnakes = Array.from(this.snakes.values());

        for (const snake of allSnakes) {
            if (!this.aliveSnakes.has(snake.id)) continue;

            while (snake.pendingInputs.length > 0) {
                const input = snake.pendingInputs.shift()!;
                snake.applyInput(input);
                if (input.sequence) {
                    snake.lastProcessedInput = input.sequence;
                }
            }

            snake.update(deltaTime, this.foodManager);
        }

        this.updateSpatialStructures();

        this.performCollisionDetection();

        for (const snake of this.aliveSnakes.values()) {
            const queryRadius = snake.radius * 2;
            const nearbyFoods = this.foodManager.foodQuadtree.query({
                x: snake.getHead().x, y: snake.getHead().y,
                width: queryRadius, height: queryRadius,
            }) as FoodType[];

            const eatenFoods = this.collisionDetector.checkFoodCollision(snake, nearbyFoods);

            for (const food of eatenFoods) {
                snake.grow(food.value);
                this.foodManager.removeFoodAndRespawn(food.id, snake);
            }
        }

        this.foodCheckTimer += deltaTime * (1000 / 60);
        if (this.foodCheckTimer >= this.FOOD_CHECK_INTERVAL) {
            this.updatePlayerFood();
            this.foodCheckTimer = 0;
        }

        this.cleanupExpiredCollisionVotes();

        return this.emitStateUpdates();
    }

    private updateSpatialStructures(): void {

        this.collisionDetector.setAliveSnakes(this.aliveSnakes);

        this.collisionDetector.updateSpatialHash(this.aliveSnakes, this.previousSnakeSegments);

        this.snakeSegmentQuadtree.clear();
        for (const snake of this.aliveSnakes.values()) {
            for (const segment of snake.segments) {
                this.snakeSegmentQuadtree.insert({
                    ...segment,
                    snakeId: snake.id,
                    id: `${snake.id}-${Math.random()}`
                });
            }
        }

        for (const [snakeId, snake] of this.aliveSnakes.entries()) {
            this.previousSnakeSegments.set(snakeId, snake.getSegmentsCopy());
        }
    }

    private performCollisionDetection(): void {

        const snakesToCheck = Array.from(this.aliveSnakes.values());

        for (const snake of snakesToCheck) {

            if (this.deadSnakesThisTick.has(snake.id)) continue;

            const wallCollision = this.collisionDetector.checkWallCollision(snake);
            if (wallCollision.collided) {
                console.log(`[SERVER BACKUP] Detected wall collision for ${snake.username} - client missed it`);
                this.confirmAndProcessDeath(wallCollision.victimId, `${wallCollision.reason} (server-detected)`);
                continue;
            }

            const snakeCollision = this.collisionDetector.checkSnakeCollision(snake);
            if (snakeCollision.collided) {
                console.log(`[SERVER BACKUP] Detected snake collision for ${snake.username} - client missed it`);
                this.confirmAndProcessDeath(
                    snakeCollision.victimId,
                    `${snakeCollision.reason} (server-detected)`,
                    snakeCollision.killerId
                );
                continue;
            }
        }
    }

    private updatePlayerFood(): void {
        for (const snake of this.aliveSnakes.values()) {
            const head = snake.getHead();
            let foodAOIRadius = snake.isBoosting ?
                config.food.FOOD_RADIUS_OF_INTEREST :
                config.food.FOOD_RADIUS_OF_INTEREST * 2;

            const nearbyFoods = this.foodManager.foodQuadtree.query({
                x: head.x,
                y: head.y,
                width: foodAOIRadius,
                height: foodAOIRadius,
            }) as FoodType[];

            const newFoodsToSend = nearbyFoods.filter(food => !snake.knownFood.has(food.id));

            if (newFoodsToSend.length > 0) {
                const spawnMsg = serialize(MessageType.S_C_FOOD_SPAWNED, { foods: newFoodsToSend });
                this.webSocketManager.send(snake.id, spawnMsg);

                for (const food of newFoodsToSend) {
                    snake.knownFood.add(food.id);
                }
            }
        }
    }

    private emitStateUpdates(): GameStatePayload | null {
        const aliveSnakesArray = Array.from(this.aliveSnakes.values());
        if (aliveSnakesArray.length === 0) return null;

        const snakeUpdates = aliveSnakesArray.map(toClientSnakeCompact);

        const leaderboard = aliveSnakesArray
            .map(s => ({ id: s.id, username: s.username, score: Math.floor(s.score), cash: s.cashUSD }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        const shouldIncludeMinimap = this.minimapUpdateTimer <= 0;
        let minimapData = undefined;

        if (shouldIncludeMinimap) {
            this.updateMinimapGrid();
            minimapData = {
                grid: this.minimapGrid.map(row => [...row])
            };
            this.minimapUpdateTimer = this.MINIMAP_UPDATE_INTERVAL;
        }

        const gameStatePayload: GameStatePayload = {
            snakes: snakeUpdates,
            leaderboard,
            lastProcessedInput: Object.fromEntries(aliveSnakesArray.map(s => [s.id, s.lastProcessedInput])),
            totalPlayer: aliveSnakesArray.length,
            minimap: minimapData
        };

        return gameStatePayload;
    }

    private getSafeSpawnPoint(): Vector2 {
        const aliveSnakesArray = Array.from(this.aliveSnakes.values());

        if (aliveSnakesArray.length === 0) {
            return { x: 0, y: 0 };
        }

        let bestSpawnPoint: Vector2 = { x: 0, y: 0 };
        let maxMinDistance = 0;
        const numberOfCandidates = 50;

        for (let i = 0; i < numberOfCandidates; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const maxRadius = config.WORLD_RADIUS - 50;
            const radius = Math.sqrt(Math.random()) * maxRadius;
            const candidatePoint = {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
            };

            let minDistance = config.WORLD_RADIUS - Math.hypot(candidatePoint.x, candidatePoint.y);

            for (const snake of aliveSnakesArray) {
                const distToSnake = Math.hypot(candidatePoint.x - snake.getHead().x, candidatePoint.y - snake.getHead().y);
                if (distToSnake < minDistance) {
                    minDistance = distToSnake;
                }
            }

            if (minDistance > maxMinDistance) {
                maxMinDistance = minDistance;
                bestSpawnPoint = candidatePoint;
            }
        }

        return bestSpawnPoint;
    }
}