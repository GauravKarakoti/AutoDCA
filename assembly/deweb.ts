import { Address, call, generateEvent } from "@massalabs/massa-as-sdk";
import { Args } from "@massalabs/as-types";

export class DeWebLogger {
  static logStrategyEvent(strategyId: string, eventData: string): void {
    const dewebAddress = "AS1TjZ25vsQq44nsif7kuexjVFNi6CXHCKamvEqgTkWsov5W1zQD" as unknown as Address;
    const args = new Args()
      .add("dcaEvent")
      .add(strategyId)
      .add(eventData);
    
    call(
      dewebAddress,
      "storeData",
      args,
      0
    );
  }
}