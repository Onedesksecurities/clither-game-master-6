
export interface CollisionObject {
    x: number;
    y: number;
    radius: number;
    id: string;
    type: 'head' | 'body';
    snakeId: string;
    segmentIndex: number;
    angle?: number;
}

export class SpatialHashGrid {
    private cellSize: number;
    private worldWidth: number;
    private worldHeight: number;
    private cols: number;
    private rows: number;
    private grid: Set<CollisionObject>[];
    private objectToCells: Map<string, number[]> = new Map();

    constructor(worldWidth: number, worldHeight: number, cellSize: number = 150) {
        this.cellSize = cellSize;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        
        this.cols = Math.ceil(worldWidth / cellSize);
        this.rows = Math.ceil(worldHeight / cellSize);
        
        this.grid = new Array(this.cols * this.rows);
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = new Set<CollisionObject>();
        }
    }


    private getCellsForObject(obj: CollisionObject): number[] {
        const cells: number[] = [];
        
        const minX = obj.x - obj.radius;
        const maxX = obj.x + obj.radius;
        const minY = obj.y - obj.radius;
        const maxY = obj.y + obj.radius;
        
        const minCellX = Math.floor((minX + this.worldWidth * 0.5) / this.cellSize);
        const maxCellX = Math.floor((maxX + this.worldWidth * 0.5) / this.cellSize);
        const minCellY = Math.floor((minY + this.worldHeight * 0.5) / this.cellSize);
        const maxCellY = Math.floor((maxY + this.worldHeight * 0.5) / this.cellSize);
        
        for (let y = Math.max(0, minCellY); y <= Math.min(this.rows - 1, maxCellY); y++) {
            for (let x = Math.max(0, minCellX); x <= Math.min(this.cols - 1, maxCellX); x++) {
                cells.push(y * this.cols + x);
            }
        }
        
        return cells;
    }

    public insert(obj: CollisionObject): void {
        const cells = this.getCellsForObject(obj);
        this.objectToCells.set(obj.id, cells);
        
        for (const cellIndex of cells) {
            this.grid[cellIndex].add(obj);
        }
    }

    public remove(obj: CollisionObject): void {
        const cells = this.objectToCells.get(obj.id);
        if (!cells) return;
        
        for (const cellIndex of cells) {
            this.grid[cellIndex].delete(obj);
        }
        
        this.objectToCells.delete(obj.id);
    }

    public update(obj: CollisionObject): void {
        this.remove(obj);
        this.insert(obj);
    }

    public queryRadius(x: number, y: number, radius: number): CollisionObject[] {
        const results: CollisionObject[] = [];
        const resultSet = new Set<CollisionObject>();
        
        const minX = x - radius;
        const maxX = x + radius;
        const minY = y - radius;
        const maxY = y + radius;
        
        const minCellX = Math.floor((minX + this.worldWidth * 0.5) / this.cellSize);
        const maxCellX = Math.floor((maxX + this.worldWidth * 0.5) / this.cellSize);
        const minCellY = Math.floor((minY + this.worldHeight * 0.5) / this.cellSize);
        const maxCellY = Math.floor((maxY + this.worldHeight * 0.5) / this.cellSize);
        
        for (let cy = Math.max(0, minCellY); cy <= Math.min(this.rows - 1, maxCellY); cy++) {
            for (let cx = Math.max(0, minCellX); cx <= Math.min(this.cols - 1, maxCellX); cx++) {
                const cellIndex = cy * this.cols + cx;
                const cell = this.grid[cellIndex];
                
                for (const obj of cell) {
                    if (!resultSet.has(obj)) {
                        resultSet.add(obj);
                        results.push(obj);
                    }
                }
            }
        }
        
        return results;
    }

    public clear(): void {
        for (const cell of this.grid) {
            cell.clear();
        }
        this.objectToCells.clear();
    }

    public getStats(): { totalObjects: number; cellsUsed: number; avgObjectsPerCell: number } {
        let totalObjects = 0;
        let cellsUsed = 0;
        
        for (const cell of this.grid) {
            if (cell.size > 0) {
                cellsUsed++;
                totalObjects += cell.size;
            }
        }
        
        return {
            totalObjects,
            cellsUsed,
            avgObjectsPerCell: cellsUsed > 0 ? totalObjects / cellsUsed : 0
        };
    }
}