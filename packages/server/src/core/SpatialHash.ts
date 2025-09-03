
import { SnakeSegment } from 'shared';
import { config } from 'shared';

export interface SpatialHashItem {
    segment: SnakeSegment;
    snakeId: string;
    segmentIndex: number;
}

export class SpatialHash {
    private grid: Map<string, SpatialHashItem[]> = new Map();
    private cellSize: number;
    private worldRadius: number;

    constructor(cellSize: number = 150) { 
        this.cellSize = cellSize;
        this.worldRadius = config.WORLD_RADIUS;
    }

    private getKey(x: number, y: number): string {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    private getCellsForRadius(x: number, y: number, radius: number): string[] {
        const keys: string[] = [];
        const minCellX = Math.floor((x - radius) / this.cellSize);
        const maxCellX = Math.floor((x + radius) / this.cellSize);
        const minCellY = Math.floor((y - radius) / this.cellSize);
        const maxCellY = Math.floor((y + radius) / this.cellSize);

        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                keys.push(`${cellX},${cellY}`);
            }
        }
        return keys;
    }

    public clear(): void {
        this.grid.clear();
    }

    public insert(segment: SnakeSegment, snakeId: string, segmentIndex: number): void {
        const key = this.getKey(segment.x, segment.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key)!.push({ segment, snakeId, segmentIndex });
    }

    public queryRadius(x: number, y: number, radius: number): SpatialHashItem[] {
        const keys = this.getCellsForRadius(x, y, radius);
        const results: SpatialHashItem[] = [];
        
        for (const key of keys) {
            const items = this.grid.get(key);
            if (items) {
                results.push(...items);
            }
        }
        
        return results;
    }

    public remove(segment: SnakeSegment, snakeId: string): void {
        const key = this.getKey(segment.x, segment.y);
        const items = this.grid.get(key);
        if (items) {
            const index = items.findIndex(item => 
                item.snakeId === snakeId && 
                item.segment.x === segment.x && 
                item.segment.y === segment.y
            );
            if (index !== -1) {
                items.splice(index, 1);
                if (items.length === 0) {
                    this.grid.delete(key);
                }
            }
        }
    }

    public updateSnake(snakeId: string, oldSegments: SnakeSegment[] | null, newSegments: SnakeSegment[]): void {
        
        if (oldSegments) {
            for (const segment of oldSegments) {
                this.remove(segment, snakeId);
            }
        }

        for (let i = 0; i < newSegments.length; i++) {
            this.insert(newSegments[i], snakeId, i);
        }
    }
}