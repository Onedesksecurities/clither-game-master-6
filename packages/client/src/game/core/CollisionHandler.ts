import { GameState } from './GameState';
import { SnakeV2 as Snake } from '../snake/SnakeV2';
import { OptimizedCollisionManager } from '../OptimizedCollisionManager';
import { NetworkManager } from '../NetworkManager';
import { config } from 'shared';

const { WORLD_RADIUS } = config;

export class CollisionHandler {
    private gameState: GameState;
    private collisionManager: OptimizedCollisionManager;
    private networkManager: NetworkManager;

    constructor(gameState: GameState, collisionManager: OptimizedCollisionManager, networkManager: NetworkManager) {
        this.gameState = gameState;
        this.collisionManager = collisionManager;
        this.networkManager = networkManager;
    }

    public checkPlayerCollisions(): void {
        if (this.gameState.playerSnake.isSpectator) return;
        if (!this.gameState.playerSnake || this.gameState.playerSnake.collided) return;

        const myCollisionHead = this.gameState.playerSnake.getCollisionHead();
        const myRadius = this.gameState.playerSnake.getCurrentRadius();

        const distFromCenter = Math.hypot(myCollisionHead.x, myCollisionHead.y);
        if (distFromCenter > WORLD_RADIUS - myRadius) {
            console.log("Wall collision - killing player immediately");
            this.killPlayer("wall");
            return;
        }

        try {
            const collisionResults = this.collisionManager.update(
                this.gameState.playerSnake,
                this.gameState.otherSnakes,
                performance.now()
            );

            for (const collision of collisionResults) {
                if (collision.victimId === this.gameState.myPlayerId!) {
                    console.log("Snake collision - killing player immediately");
                    this.killPlayer("snake", collision.killerId);
                    return;
                } else {
                    this.reportCollisionWithOptimism(collision.victimId, collision.killerId);
                }
            }
        } catch (error) {
            console.error("Collision detection error:", error);
        }
    }

    private killPlayer(type: "wall" | "snake", killerId?: string): void {
        if (!this.gameState.playerSnake || this.gameState.playerSnake.collided) {
            return;
        }

        console.log(`Player died from ${type} collision`);

        this.gameState.playerSnake.snakeCollided();
        this.gameState.deathPosition = this.gameState.playerSnake.getHeadPosition();

        if (type === "wall") {
            this.networkManager.sendCollisionReport(this.gameState.myPlayerId!, this.gameState.myPlayerId!);
        } else if (killerId) {
            this.networkManager.sendCollisionReport(this.gameState.myPlayerId!, killerId);
        }

        this.startDeathSequence();

        console.log("Player death handling complete");
    }

    private startDeathSequence(): void {
        console.log("Starting client-side death sequence...");

        setTimeout(() => {
            if (!this.gameState.isGameOver) {
                console.log("Death sequence timeout - triggering game over");
                this.triggerGameOver();
            }
        }, 2000);
    }

    public triggerGameOver(): void {
        if (this.gameState.isGameOver) return;

        console.log("Triggering game over...");
        this.gameState.isGameOver = true;

        if (this.gameState.playerSnake) {
            this.gameState.playerSnake.startDeathAnimation(() => {
                this.gameState.playerSnake.destroy();
            });
        }
    }

    private reportCollisionWithOptimism(victimId: string, killerId: string): void {
        const now = Date.now();
        const reportId = `${victimId}_${killerId}_${now}`;

        if (this.gameState.hasRecentCollisionReport(victimId)) {
            return;
        }

        this.gameState.addCollisionReport(reportId, {
            timestamp: now,
            victimId,
            killerId,
            reportedAt: now
        });

        if (victimId !== this.gameState.myPlayerId!) {
            const victimSnake = this.gameState.otherSnakes.get(victimId);
            if (victimSnake && !victimSnake.collided) {
                console.log(`Optimistically killing snake ${victimId}`);
                victimSnake.snakeCollided();
                this.storeRollbackState(victimId, victimSnake);
            }
        }

        this.networkManager.sendCollisionReport(victimId, killerId);
    }

    private storeRollbackState(snakeId: string, snake: Snake): void {
        this.gameState.addRollbackState(snakeId, {
            position: snake.getHeadPosition(),
            segments: [...snake.getSegments()],
            collided: snake.collided,
            timestamp: Date.now()
        });

        setTimeout(() => {
            this.gameState.removeRollbackState(snakeId);
        }, 2000);
    }

    public cleanupExpiredCollisionReports(): void {
        const now = Date.now();
        const expiredReports: string[] = [];

        for (const [reportId, report] of this.gameState.getCollisionReports()) {
            if (now - report.timestamp > this.gameState.getCollisionTimeout()) {
                console.log(`Collision report expired: ${reportId}`);

                if (report.victimId !== this.gameState.myPlayerId!) {
                    this.rollbackOptimisticDeath(report.victimId);
                }
                expiredReports.push(reportId);
            }
        }

        expiredReports.forEach(reportId => {
            this.gameState.removeCollisionReport(reportId);
        });
    }

    private rollbackOptimisticDeath(snakeId: string): void {
        const snake = this.gameState.otherSnakes.get(snakeId);
        const rollbackState = this.gameState.getRollbackState(snakeId);

        if (snake && rollbackState && snake.collided) {
            console.log(`Rolling back optimistic death for snake ${snakeId}`);
            snake.snakeRelease();
        }
    }
}