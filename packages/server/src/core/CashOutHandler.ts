import { PriceService } from '../services/PriceService';
import { Player } from '../types/AppTypes';

export interface CashOutResult {
    success: boolean;
    slitherAmount?: number;
    usdAmount?: number;
    error?: string;
}

export class CashOutHandler {
    
    static async processCashOut(player: Player): Promise<CashOutResult> {
        try {
            if (!player.isAlive) {
                return {
                    success: false,
                    error: 'Player is already dead'
                };
            }

            if (player.cashUSD <= 0) {
                return {
                    success: false,
                    error: 'No cash to cash out'
                };
            }

            const priceService = PriceService.getInstance();
            const currentSOLUSD = await priceService.getCurrentSOLUSD();
            const slitherAmount = player.cashUSD / currentSOLUSD;
            
            console.log(`Processing cashout for ${player.username}: $${player.cashUSD.toFixed(2)} USD = ${slitherAmount.toFixed(6)} SOL`);
            
            player.isAlive = false;
            player.deathTime = Date.now();
            
            return {
                success: true,
                slitherAmount,
                usdAmount: player.cashUSD
            };
        } catch (error) {
            console.error('Error processing cashout:', error);
            return {
                success: false,
                error: 'Failed to process cashout'
            };
        }
    }
}