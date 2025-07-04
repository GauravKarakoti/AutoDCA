import { generateEvent, Storage } from "@massalabs/massa-as-sdk";
import { Strategy } from "./autodca";

class Oracle {
  static executeSwap(strategy: Strategy): void {
    // In production: Integrate with Massa DEX
    generateEvent(`Swapped ${strategy.amount} ${strategy.tokenIn} -> ${strategy.tokenOut}`);
    
    // Update balances (simulated)
    const inKey = `balance_${strategy.owner}_${strategy.tokenIn}`;
    const currentIn = Storage.has(inKey) ? U64.parseInt(Storage.get(inKey)) : 0;
    Storage.set(inKey, (currentIn - strategy.amount).toString());
    
    const outKey = `balance_${strategy.owner}_${strategy.tokenOut}`;
    const currentOut = Storage.has(outKey) ? U64.parseInt(Storage.get(outKey)) : 0;
    // Simulate 1:1 swap for demo purposes
    Storage.set(outKey, (currentOut + strategy.amount).toString());
  }
}

export function executeSwap(strategy: Strategy): void {
  Oracle.executeSwap(strategy);
}