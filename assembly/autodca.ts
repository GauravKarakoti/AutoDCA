import { generateEvent, Context, Storage, call } from "@massalabs/massa-as-sdk";
import { hasSufficientBalance } from "./vault";
import { executeSwap } from "./oracle";
import { Args } from "@massalabs/as-types"

class AutoDCA {
  static createStrategy(
    tokenIn: string,
    tokenOut: string,
    amount: u64,
    interval: u64
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

    // Store strategy
    Storage.set(`strategy_${strategyId}`, strategy.serialize());
    Storage.set('nextId', (U64.parseInt(strategyId) + 1).toString());

    const args = new Args().add(strategyId);


    // Schedule first execution
    call(
      Context.callee(), // Address of the current contract
      "executeStrategy",
      args,
      0, // Coins to send
    );

    generateEvent(`Strategy ${strategyId} created`);
  }

  static executeStrategy(args: Args): void {
    const strategyId = args.nextString().unwrap();
    
    const strategy = Strategy.deserialize(Storage.get(`strategy_${strategyId}`));
    
    // Check vault balance
    if (hasSufficientBalance(strategy)) {
      strategy.active = false;
      Storage.set(`strategy_${strategyId}`, strategy.serialize());
      generateEvent(`Strategy ${strategyId} paused`);
      return;
    }

    // Execute swap
    executeSwap(strategy);

    // Reschedule next execution (reuse serialized args)
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
    public active: bool = true
  ) {}

  serialize(): string {
    return `${this.id}|${this.owner}|${this.tokenIn}|${this.tokenOut}|${this.amount}|${this.interval}|${this.active ? 1 : 0}`;
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
      parts[6] === '1'
    );
  }
}

export function createStrategy(tokenIn: string, tokenOut: string, amount: u64, interval: u64): void {
  AutoDCA.createStrategy(tokenIn, tokenOut, amount, interval);
}

export function executeStrategy(args: StaticArray<u8>): void {
  AutoDCA.executeStrategy(new Args(args));
}