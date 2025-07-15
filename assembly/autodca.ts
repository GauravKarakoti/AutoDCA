import { generateEvent, Context, Storage, call } from "@massalabs/massa-as-sdk";
import { hasSufficientBalance } from "./vault";
import { executeSwap } from "./oracle";
import { Args } from "@massalabs/as-types"

// Massa network has 32 threads
const THREAD_COUNT: u64 = 32;

class AutoDCA {
  static createStrategy(
    tokenIn: string,
    tokenOut: string,
    amount: u64,
    interval: u64,
  ): void {
    const strategyId = Storage.get('nextId') || '1';
    const strategy = new Strategy(
      strategyId,
      Context.caller().toString(),
      tokenIn,
      tokenOut,
      amount,
      interval
    );

    Storage.set(`strategy_${strategyId}`, strategy.serialize());
    Storage.set('nextId', (U64.parseInt(strategyId) + 1).toString());

    const args = new Args().add(strategyId);

    // Schedule using precise slot timing
    call(
      Context.callee(),
      "executeStrategy",
      args,
      0,
    );

    generateEvent(`Strategy ${strategyId} created`);
  }

  static recoverFailedSwap(strategyId: string): void {
    const strategy = Strategy.deserialize(Storage.get(`strategy_${strategyId}`));
    
    // Calculate current absolute slot
    const currentSlot = Context.currentPeriod() * THREAD_COUNT + Context.currentThread() as u64;
    
    // Verify failure window (last 10 slots)
    if (currentSlot > strategy.lastAttempt + 10) return;
    
    // Reschedule with precise timing
    const args = new Args().add(strategyId);
    call(
      Context.callee(),
      "executeStrategy",
      args,
      0,
    );
  }

  static executeStrategy(args: Args): void {
    const strategyId = args.nextString().unwrap();
    const strategy = Strategy.deserialize(Storage.get(`strategy_${strategyId}`));
    
    if (hasSufficientBalance(strategy)) {
      strategy.active = false;
      Storage.set(`strategy_${strategyId}`, strategy.serialize());
      generateEvent(`Strategy ${strategyId} paused`);
      return;
    }

    // Record attempt slot
    strategy.lastAttempt = Context.currentPeriod() * THREAD_COUNT + Context.currentThread() as u64;
    Storage.set(`strategy_${strategyId}`, strategy.serialize());

    // Execute swap
    executeSwap(strategy);

    // Calculate next execution slot
    const nextSlot = Context.currentPeriod() * THREAD_COUNT + Context.currentThread() as u64 + strategy.interval;

    // Reschedule with precise timing
    call(
      Context.callee(),
      "executeStrategy",
      args,
      0,
    );
  }
}

export class Strategy {
  constructor(
    public id: string,
    public owner: string,
    public tokenIn: string,
    public tokenOut: string,
    public amount: u64,
    public interval: u64,
    public active: bool = true,
    public lastAttempt: u64 = 0  // Added property
  ) {}

  serialize(): string {
    return `${this.id}|${this.owner}|${this.tokenIn}|${this.tokenOut}|${this.amount}|${this.interval}|${this.active ? 1 : 0}|${this.lastAttempt}`;
  }

  static deserialize(data: string): Strategy {
    const parts = data.split('|');
    return new Strategy(
      parts[0],
      parts[1],
      parts[2],
      parts[3],
      U64.parseInt(parts[4]),
      U64.parseInt(parts[5]),
      parts[6] === '1',
      parts.length > 7 ? U64.parseInt(parts[7]) : 0
    );
  }
}

export function createStrategy(tokenIn: string, tokenOut: string, amount: u64, interval: u64): void {
  AutoDCA.createStrategy(tokenIn, tokenOut, amount, interval);
}

export function executeStrategy(args: StaticArray<u8>): void {
  AutoDCA.executeStrategy(new Args(args));
}

export function recoverFailedSwap(strategyId: string): void {
  AutoDCA.recoverFailedSwap(strategyId);
}