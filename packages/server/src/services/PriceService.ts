import fetch from "node-fetch";
export class PriceService {
    private static instance: PriceService;
    private currentSOLUSD: number = 150; 
    private lastUpdate: number = 0;
    private updateInterval = 60000; 

    static getInstance(): PriceService {
        if (!this.instance) {
            this.instance = new PriceService();
            this.instance.initializePrice();
        }
        return this.instance;
    }

    private async initializePrice(): Promise<void> {
        await this.updatePrice();
    }

    async getCurrentSOLUSD(): Promise<number> {
        const now = Date.now();
        if (now - this.lastUpdate > this.updateInterval) {
            await this.updatePrice();
        }
        return this.currentSOLUSD;
    }

    private async updatePrice(): Promise<void> {
        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
            );
            const data = await response.json();
            this.currentSOLUSD = data.solana.usd;
            this.lastUpdate = Date.now();
            console.log(`Updated SOL/USD rate: $${this.currentSOLUSD}`);
        } catch (error) {
            console.error('Failed to update SOL price:', error);
        }
    }
}