import { generateEvent, Context, Storage, call } from "@massalabs/massa-as-sdk";
import { hasSufficientBalance } from "./vault";
import { executeSwap } from "./oracle";
import { Args } from "@massalabs/as-types"
import { DeWebLogger } from "./deweb";

// Massa network has 32 threads
const THREAD_COUNT: u64 = 32;

class AutoDCA {
  static createStrategy(
    tokenIn: string,
    tokenOut: string,
    amount: u64,
    interval: u64,
    slippage: u64 = 100, // 1% default slippage
    isTemplate: bool = false
  ): void {
    const strategyId = Storage.get('nextId') || '1';
    const caller = Context.caller().toString();

    // Apply free trades for first 3 strategies
    const freeTrades = Storage.get(`free_${caller}`) || "3";
    const feeExempt = (U64.parseInt(freeTrades) > 0) && !isTemplate;
    const strategy = new Strategy(
      strategyId,
      Context.caller().toString(),
      tokenIn,
      tokenOut,
      amount,
      interval,
      slippage,
      feeExempt
    );

    Storage.set(`strategy_${strategyId}`, strategy.serialize());
    Storage.set('nextId', (U64.parseInt(strategyId) + 1).toString());

    if (!isTemplate && feeExempt) {
      Storage.set(`free_${caller}`, (U64.parseInt(freeTrades) - 1).toString());
    }

    // Log strategy creation
    const eventData = `Created|${tokenIn}|${tokenOut}|${amount}|${interval}|${slippage}`;
    DeWebLogger.logStrategyEvent(strategyId, eventData);

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

  static createTemplateStrategy(templateId: u64): void {
    let tokenIn = "USDC";
    let tokenOut = "ETH";
    let amount = 10_000_000_000; // $10
    let interval = 86_400; // Daily
    let slippage = 150; // 1.5% slippage

    switch(templateId) {
      case 1: // Stablecoin Yield Farmer
        tokenOut = "MAS";
        slippage = 50; // 0.5%
        break;
      case 2: // Blue-Chip Accumulator
        tokenOut = "BTC";
        amount = 50_000_000_000; // $50
        interval = 604_800; // Weekly
        break;
    }

    this.createStrategy(tokenIn, tokenOut, amount, interval, slippage, true);
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
    const { bestPrice, feeApplied } = executeSwap(strategy);

    const eventData = `Executed|${strategy.amount}|${bestPrice}|${feeApplied}`;
    DeWebLogger.logStrategyEvent(strategyId, eventData);

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
    public slippage: u64 = 100, // 1% default
    public feeExempt: bool = false,
    public active: bool = true,
    public lastAttempt: u64 = 0  // Added property
  ) {}

  serialize(): string {
    return `${this.id}|${this.owner}|${this.tokenIn}|${this.tokenOut}|${this.amount}|${this.interval}|${this.slippage}|${this.feeExempt ? 1 : 0}|${this.active ? 1 : 0}|${this.lastAttempt}`;
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
      parts.length > 6 ? U64.parseInt(parts[6]) : 100,
      parts.length > 7 ? parts[7] === '1' : false,
      parts.length > 8 ? parts[8] === '1' : true,
      parts.length > 9 ? U64.parseInt(parts[9]) : 0
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