
import { Vector2 } from '../utils/Vector2';

interface IQuadtreeItem {
    x: number;
    y: number;
    id: any;
}

interface Boundary {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class Quadtree<T extends IQuadtreeItem> {
    private boundary: Boundary;
    private capacity: number;
    private points: T[] = [];
    private divided: boolean = false;
    private northeast!: Quadtree<T>;
    private northwest!: Quadtree<T>;
    private southeast!: Quadtree<T>;
    private southwest!: Quadtree<T>;

    constructor(boundary: Boundary, capacity: number) {
        this.boundary = boundary;
        this.capacity = capacity;
    }

    private subdivide(): void {
        const { x, y, width, height } = this.boundary;
        const hw = width / 2;
        const hh = height / 2;

        const ne = { x: x + hw, y: y - hh, width: hw, height: hh };
        this.northeast = new Quadtree<T>(ne, this.capacity);
        const nw = { x: x - hw, y: y - hh, width: hw, height: hh };
        this.northwest = new Quadtree<T>(nw, this.capacity);
        const se = { x: x + hw, y: y + hh, width: hw, height: hh };
        this.southeast = new Quadtree<T>(se, this.capacity);
        const sw = { x: x - hw, y: y + hh, width: hw, height: hh };
        this.southwest = new Quadtree<T>(sw, this.capacity);

        this.divided = true;
    }

    public insert(point: T): boolean {
        if (!this.contains(point)) {
            return false;
        }

        if (this.points.length < this.capacity) {
            this.points.push(point);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        return (
            this.northeast.insert(point) ||
            this.northwest.insert(point) ||
            this.southeast.insert(point) ||
            this.southwest.insert(point)
        );
    }

    public query(range: Boundary, found: T[] = []): T[] {
        if (!this.intersects(range)) {
            return found;
        }

        for (const p of this.points) {
            if (this.contains(p, range)) {
                found.push(p);
            }
        }

        if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }

        return found;
    }

    public remove(point: T): boolean {
        if (!this.contains(point)) {
            return false;
        }

        const index = this.points.findIndex(p => p.id === point.id);
        if (index !== -1) {
            this.points.splice(index, 1);
            return true;
        }

        if (this.divided) {
            return (
                this.northeast.remove(point) ||
                this.northwest.remove(point) ||
                this.southeast.remove(point) ||
                this.southwest.remove(point)
            );
        }

        return false;
    }

    private contains(point: { x: number, y: number }, boundary: Boundary = this.boundary): boolean { // 👈 MODIFIED
        return (
            point.x >= boundary.x - boundary.width &&
            point.x <= boundary.x + boundary.width &&
            point.y >= boundary.y - boundary.height &&
            point.y <= boundary.y + boundary.height
        );
    }

    private intersects(range: Boundary): boolean {
        return !(
            range.x - range.width > this.boundary.x + this.boundary.width ||
            range.x + range.width < this.boundary.x - this.boundary.width ||
            range.y - range.height > this.boundary.y + this.boundary.height ||
            range.y + range.height < this.boundary.y - this.boundary.height
        );
    }

    public clear(): void {
        this.points = [];
        this.divided = false;
        if (this.northeast) {
            this.northeast.clear();
            this.northwest.clear();
            this.southeast.clear();
            this.southwest.clear();
        }
    }
}