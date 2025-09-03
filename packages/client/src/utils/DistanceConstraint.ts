
import { VerletParticle } from './VerletParticle';
import { Vector2 } from 'shared';

export class DistanceConstraint {
    public p1: VerletParticle;
    public p2: VerletParticle;
    public restLength: number;
    public stiffness: number;

    constructor(p1: VerletParticle, p2: VerletParticle, restLength: number, stiffness: number = 1) {
        this.p1 = p1;
        this.p2 = p2;
        this.restLength = restLength;
        this.stiffness = stiffness;
    }

    public solve(): void {
        const diff = Vector2.sub(this.p1.pos, this.p2.pos);
        const currentLength = diff.mag();
        
        const difference = (this.restLength - currentLength) / currentLength;
        
        const correction = diff.mult(0.5 * difference * this.stiffness);

        this.p1.pos.add(correction);
        this.p2.pos.sub(correction);
    }
}