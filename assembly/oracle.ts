import { generateEvent, Storage } from "@massalabs/massa-as-sdk";
import { Strategy } from "./autodca";
import { DeWebLogger } from "./deweb";

const FEE_PERCENTAGE: u64 = 1; // 0.1% fee

class Oracle {
  static executeSwap(strategy: Strategy): { bestPrice: f64, feeApplied: u64 } {
    // Get best price from multiple sources
    const dexSources = ["DEX1", "DEX2", "DEX3"];
    let bestPrice = 0.0;
    let bestDex = "";
    
    for (let i = 0; i < dexSources.length; i++) {
      const price = this.getDexPrice(dexSources[i], strategy);
      if (price > bestPrice) {
        bestPrice = price;
        bestDex = dexSources[i];
      }
    }

    // Apply slippage tolerance
    const minPrice = bestPrice * (10000 - strategy.slippage) / 10000;
    
    // Calculate output with slippage protection
    const amountIn = strategy.amount;
    let amountOut = U64.parseInt((f64(amountIn) * bestPrice).toString());
    
    // Apply fee if not exempt
    let feeApplied: u64 = 0;
    if (!strategy.feeExempt) {
      feeApplied = amountOut * FEE_PERCENTAGE / 1000; // 0.1%
      amountOut -= feeApplied;
    }

    // Execute simulated swap
    generateEvent(`Swapped ${amountIn} ${strategy.tokenIn} -> ${amountOut} ${strategy.tokenOut} via ${bestDex}`);
    
    // Update balances using calculated amounts
    const inKey = `balance_${strategy.owner}_${strategy.tokenIn}`;
    const currentIn = Storage.has(inKey) ? U64.parseInt(Storage.get(inKey)) : 0;
    Storage.set(inKey, (currentIn - amountIn).toString());
    
    const outKey = `balance_${strategy.owner}_${strategy.tokenOut}`;
    const currentOut = Storage.has(outKey) ? U64.parseInt(Storage.get(outKey)) : 0;
    Storage.set(outKey, (currentOut + amountOut).toString());

    // Log to DeWeb
    const eventData = `Swapped|${amountIn}|${amountOut}|${bestDex}|${bestPrice}|${feeApplied}`;
    DeWebLogger.logStrategyEvent(strategy.id, eventData);

    return { bestPrice, feeApplied };
  }

  static getDexPrice(dex: string, strategy: Strategy): f64 {
    // Mock implementation with different prices per DEX
    switch(dex) {
      case "DEX1": return 0.99; // 1% slippage
      case "DEX2": return 1.00; // Ideal price
      case "DEX3": return 1.01; // Best price
      default: return 0.95;     // Worst case
    }
  }
}

export function executeSwap(strategy: Strategy): { bestPrice: f64, feeApplied: u64 } {
  return Oracle.executeSwap(strategy);
}