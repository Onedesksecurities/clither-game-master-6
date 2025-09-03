
import { SnakeV2 } from '../snake/SnakeV2';

export class GameState {
    public isRunning: boolean = false;
    public isGameOver: boolean = false;
    public myPlayerId: string | null = null;
    public playerSnake!: SnakeV2;
    public otherSnakes: Map<string, SnakeV2> = new Map();
    public deathPosition: { x: number, y: number } | null = null;
    public totalPlayers: number = 0;
    public ping: number = 0;
    private inputSequenceNumber: number = 0;

    public gameStartTime: number = 0;

    public startingAmount: number = 0;

    private pendingInputs: { sequence: number; targetAngle: number; isBoosting: boolean }[] = [];
    private pendingCollisionReports: Map<string, {
        timestamp: number;
        victimId: string;
        killerId: string;
        reportedAt: number;
    }> = new Map();

    private rollbackStates: Map<string, {
        position: { x: number, y: number };
        segments: any[];
        collided: boolean;
        timestamp: number;
    }> = new Map();

    private readonly COLLISION_TIMEOUT = 1000;
    private readonly COLLISION_REPORT_COOLDOWN = 100;

    public getNextInputSequence(): number {
        return ++this.inputSequenceNumber;
    }

    public setStartingAmount(startingAmount: number) {
        this.startingAmount = startingAmount
    }


    public getStartingAmount(): number {
        return this.startingAmount
    }

    public addPendingInput(input: { sequence: number; targetAngle: number; isBoosting: boolean }): void {
        this.pendingInputs.push(input);
    }

    public filterPendingInputs(lastProcessedSequence: number): void {
        this.pendingInputs = this.pendingInputs.filter(
            (input) => input.sequence > lastProcessedSequence
        );
    }

    public setGameStartTime(): void {
        this.gameStartTime = Date.now();
    }

    public getGameDurationSeconds(): number {
        if (this.gameStartTime === 0) return 0;
        return (Date.now() - this.gameStartTime) / 1000;
    }

    public getPendingInputs(): { sequence: number; targetAngle: number; isBoosting: boolean }[] {
        return this.pendingInputs;
    }

    public addCollisionReport(reportId: string, report: {
        timestamp: number;
        victimId: string;
        killerId: string;
        reportedAt: number;
    }): void {
        this.pendingCollisionReports.set(reportId, report);
    }

    public removeCollisionReport(reportId: string): void {
        this.pendingCollisionReports.delete(reportId);
    }

    public getCollisionReports(): Map<string, {
        timestamp: number;
        victimId: string;
        killerId: string;
        reportedAt: number;
    }> {
        return this.pendingCollisionReports;
    }

    public addRollbackState(snakeId: string, state: {
        position: { x: number, y: number };
        segments: any[];
        collided: boolean;
        timestamp: number;
    }): void {
        this.rollbackStates.set(snakeId, state);
    }

    public removeRollbackState(snakeId: string): void {
        this.rollbackStates.delete(snakeId);
    }

    public getRollbackState(snakeId: string) {
        return this.rollbackStates.get(snakeId);
    }

    public hasRecentCollisionReport(victimId: string): boolean {
        const now = Date.now();
        for (const [, report] of this.pendingCollisionReports) {
            if (report.victimId === victimId &&
                (now - report.reportedAt) < this.COLLISION_REPORT_COOLDOWN) {
                return true;
            }
        }
        return false;
    }

    public getCollisionTimeout(): number {
        return this.COLLISION_TIMEOUT;
    }

    public clearCollisionData(): void {
        this.pendingCollisionReports.clear();
        this.rollbackStates.clear();
    }
}
