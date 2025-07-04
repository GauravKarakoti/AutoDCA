import { JsonRpcProvider, SmartContract, Account, PublicAPI } from '@massalabs/massa-web3';
import { MouseEventHandler } from 'react';

export default function StrategyForm() {
  const createStrategy = async (account: Account) => {
    // 1. Initialize provider
    const provider = new JsonRpcProvider('https://buildnet.massa.net/api/v2' as unknown as PublicAPI, account);
    
    // 2. Create contract instance
    const contract = new SmartContract(
      provider,
      'AUTO_DCA_CONTRACT_ADDRESS',
    );
    
    const serializedArgs = serializeStrategyArgs(
      'USDC',
      'ETH',
      1000000000n,
      86400n
    );

    // 3. Call contract method
    await contract.call(
      'createStrategy',
      serializedArgs,
      {coins: 0n, fee: 0n, maxGas: 1000000n}
    );
  };

  function serializeStrategyArgs(
    tokenIn: string,
    tokenOut: string,
    amount: bigint,
    interval: bigint
  ): Uint8Array {
    // Create a buffer with fixed size
    const buffer = new ArrayBuffer(2 + tokenIn.length + tokenOut.length + 8 + 8);
    const view = new DataView(buffer);
    let offset = 0;
    
    // Add tokenIn (string)
    view.setUint8(offset++, tokenIn.length);
    for (let i = 0; i < tokenIn.length; i++) {
      view.setUint8(offset++, tokenIn.charCodeAt(i));
    }
    
    // Add tokenOut (string)
    view.setUint8(offset++, tokenOut.length);
    for (let i = 0; i < tokenOut.length; i++) {
      view.setUint8(offset++, tokenOut.charCodeAt(i));
    }
    
    // Add amount (u64)
    view.setBigUint64(offset, amount, true);
    offset += 8;
    
    // Add interval (u64)
    view.setBigUint64(offset, interval, true);
    
    return new Uint8Array(buffer);
  }

  return (
    <div className="strategy-form">
      <h3>Create DCA Strategy</h3>
      <button onClick={createStrategy as unknown as MouseEventHandler<HTMLButtonElement>}>Start $10 Daily ETH Purchase</button>
    </div>
  );
}