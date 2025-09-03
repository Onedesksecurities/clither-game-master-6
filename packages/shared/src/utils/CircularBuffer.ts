
export class CircularBuffer<T> {
    private buffer: T[];
    private size: number;
    private head: number = 0;
    public length: number = 0;

    constructor(size: number) {
        this.buffer = new Array(size);
        this.size = size;
    }

    public push(item: T): void {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.size;
        if (this.length < this.size) {
            this.length++;
        }
    }

    public get(index: number): T | undefined {
        if (index < 0 || index >= this.length) {
            return undefined;
        }
        const physicalIndex = (((this.head - 1 - index) % this.size) + this.size) % this.size;
        return this.buffer[physicalIndex];
    }
    
    public *[Symbol.iterator](): IterableIterator<T> {
        for (let i = this.length - 1; i >= 0; i--) {
            yield this.get(i)!;
        }
    }

    public toArray(): T[] {
        return [...this];
    }

    public clear(){
        this.buffer = new Array(this.size);
    }

}