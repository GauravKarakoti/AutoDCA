import { generateEvent, Context, Storage } from "@massalabs/massa-as-sdk";
import { Strategy } from "./autodca";
 
class Vault {
  static deposit(token: string, amount: u64): void {
    const key = `balance_${Context.caller().toString()}_${token}`;
    const current = Storage.has(key) ? U64.parseInt(Storage.get(key)) : 0;
    Storage.set(key, (current + amount).toString());
    generateEvent(`Deposited ${amount} ${token}`);
  }

  static hasSufficientBalance(strategy: Strategy): bool {
    const key = `balance_${strategy.owner}_${strategy.tokenIn}`;
    if (!Storage.has(key)) return false;
    
    const balance = U64.parseInt(Storage.get(key));
    const required = strategy.amount;
    
    // 110% buffer check
    return balance >= required + required / U64.parseInt("10");
  }
}

export function deposit(token: string, amount: u64): void {
  Vault.deposit(token, amount);
}

export function hasSufficientBalance(strategy: Strategy): bool {
  return Vault.hasSufficientBalance(strategy);
}