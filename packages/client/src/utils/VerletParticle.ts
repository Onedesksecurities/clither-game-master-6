import { Vector2 } from 'shared';

export class VerletParticle {
    public pos: Vector2;
    public oldpos: Vector2;
    private friction: number = 0.99; 

    constructor(x: number, y: number) {
        this.pos = new Vector2(x, y);
        this.oldpos = new Vector2(x, y);
    }

    public update(): void {
        const vel = Vector2.sub(this.pos, this.oldpos);
        vel.mult(this.friction);

        this.oldpos.x = this.pos.x;
        this.oldpos.y = this.pos.y;

        this.pos.add(vel);
    }
}