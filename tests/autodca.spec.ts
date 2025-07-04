import { Storage, Context, call, generateEvent } from "@massalabs/massa-as-sdk";
import { AutoDCA, Strategy } from "../assembly/autodca";
import { Vault } from "../assembly/vault";
import { Oracle } from "../assembly/oracle";

describe("AutoDCA Contract", () => {
  // Mock addresses
  const USER1 = "AU12c8P9ZCoW6Ae4t9v3v6yZiJ5tZMx5v7WcF1hq3RvHq1";
  
  beforeAll(() => {
    // Initialize storage
    Storage.set("nextId", "1");
    Context.setCaller(USER1);
    Context.setPeriod(100);
    Context.setThread(5);
  });

  test("createStrategy - should create new strategy", () => {
    AutoDCA.createStrategy("USDC", "ETH", 1000000000, 86400); // $10 daily
    
    const strategy = Strategy.deserialize(Storage.get("strategy_1")!);
    
    expect(strategy.id).toBe("1");
    expect(strategy.owner).toBe(USER1);
    expect(strategy.tokenIn).toBe("USDC");
    expect(strategy.tokenOut).toBe("ETH");
    expect(strategy.amount).toBe(1000000000);
    expect(strategy.interval).toBe(86400);
    expect(strategy.active).toBe(true);
    
    // Check scheduled call
    const calls = call.getScheduledCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].functionName).toBe("executeStrategy");
  });

  test("executeStrategy - should swap tokens", () => {
    // Setup strategy
    Storage.set("strategy_1", new Strategy("1", USER1, "USDC", "ETH", 1000000000, 86400).serialize());
    
    // Deposit funds
    Vault.deposit("USDC", 1100000000); // $11 (110% of trade amount)
    
    // Execute strategy
    Context.setCurrentSlot(1000); // Set block number
    AutoDCA.executeStrategy("1");
    
    // Check balance update
    const balance = parseInt(Storage.get("balance_AU12c8P9ZCoW6Ae4t9v3v6yZiJ5tZMx5v7WcF1hq3RvHq1_USDC")!);
    expect(balance).toBe(100000000); // $11 - $10 = $1 remaining
    
    // Check rescheduling
    const calls = call.getScheduledCalls();
    expect(calls[0].validityStart).toBe(1000 + 86400);
  });

  test("executeStrategy - should pause on low balance", () => {
    // Setup strategy with insufficient funds
    Storage.set("strategy_1", new Strategy("1", USER1, "USDC", "ETH", 1000000000, 86400).serialize());
    Vault.deposit("USDC", 900000000); // $9 (less than $10)
    
    AutoDCA.executeStrategy("1");
    
    const strategy = Strategy.deserialize(Storage.get("strategy_1")!);
    expect(strategy.active).toBe(false);
    
    const events = generateEvent.getEvents();
    expect(events).toContainEqual("Strategy 1 paused: insufficient funds");
  });
});