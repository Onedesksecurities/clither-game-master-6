import { Snake } from './Snake';

export interface CashDistributionResult {
    killerReward: number;
    killerId?: string;
    nearestReward: number;
    nearestPlayerId?: string;
}

export class CashDistribution {
    
    static distributeDeathCash(
        victim: Snake,
        killer: Snake | null,
        allAliveSnakes: Map<string, Snake>
    ): CashDistributionResult {
        const victimCash = victim.cashUSD;
        const rewardAmount = victimCash * 0.7; 
        
        console.log(`Distributing death cash: Victim ${victim.username} had $${victimCash.toFixed(2)}, distributing $${rewardAmount.toFixed(2)}`);
        
        if (killer) {
            
            killer.cashUSD += rewardAmount;
            killer.kills++;
            console.log(`Killer ${killer.username} received $${rewardAmount.toFixed(2)}, new total: $${killer.cashUSD.toFixed(2)}`);
            
            return {
                killerReward: rewardAmount,
                killerId: killer.id,
                nearestReward: 0
            };
        } else {
            
            const nearest = this.findNearestSnake(victim, allAliveSnakes);
            if (nearest) {
                nearest.cashUSD += rewardAmount;
                console.log(`Nearest snake ${nearest.username} received $${rewardAmount.toFixed(2)} from wall death, new total: $${nearest.cashUSD.toFixed(2)}`);
                
                return {
                    killerReward: 0,
                    nearestReward: rewardAmount,
                    nearestPlayerId: nearest.id
                };
            }
            
            console.log(`No nearest snake found for wall death distribution`);
            return {
                killerReward: 0,
                nearestReward: 0
            };
        }
    }
    
    private static findNearestSnake(
        victim: Snake,
        allSnakes: Map<string, Snake>
    ): Snake | null {
        let nearest: Snake | null = null;
        let minDistance = Infinity;
        
        const victimHead = victim.getHead();
        
        for (const snake of allSnakes.values()) {
            if (snake.id === victim.id) continue;
            
            const snakeHead = snake.getHead();
            const distance = Math.hypot(
                snakeHead.x - victimHead.x,
                snakeHead.y - victimHead.y
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = snake;
            }
        }
        
        if (nearest) {
            console.log(`Found nearest snake: ${nearest.username} at distance ${minDistance.toFixed(2)}`);
        }
        
        return nearest;
    }
}