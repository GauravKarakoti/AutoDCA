import { JsonRpcProvider, SmartContract, Account, PublicAPI, Args } from '@massalabs/massa-web3';
import { useState, useEffect } from 'react';
import { initPublicProvider, getDeWebData } from '../lib/massa-web3';
import { OperationStatus } from '@massalabs/massa-web3/dist/cmd/operation/types'; 

interface StrategyFormProps {
  account: Account;
}

export default function StrategyForm({ account }: StrategyFormProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const THREAD_COUNT = 32n;

  const createStrategy = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // 1. Initialize provider
      const provider = new JsonRpcProvider(
        'https://buildnet.massa.net/api/v2' as unknown as PublicAPI,
        account
      );

      // 2. Create contract instance
      const contract = new SmartContract(
        provider,
        'AUTO_DCA_CONTRACT_ADDRESS'  // ← replace with your deployed address
      );

      // 3. Get current cycle from public node status
      const publicProvider = initPublicProvider();
      const nodeStatus = await publicProvider.getNodeStatus();
      const currentCycle = BigInt(nodeStatus.currentCycle);
      // schedule for the next cycle (period) at thread 0:
      const activationSlot = (currentCycle + 1n) * THREAD_COUNT;

      // 4. Build the args
      const args = new Args()
        .addString('USDC')                // tokenIn
        .addString('ETH')                 // tokenOut
        .addU64(1_000_000_000n)           // amount in base units ($10)
        .addU64(86_400n)                  // interval in seconds (daily)
        .addU64(activationSlot);          // when to start

      // 5. Call the contract
      const operation = await contract.call(
        'createStrategy',
        args.serialize(),
        { coins: 0n, fee: 0n, maxGas: 1_000_000n }
      );

      // 6. Wait for final execution (up to 30s)
      const status = await operation.waitFinalExecution(30_000, 1_000);
      if (status !== OperationStatus.Success && status !== OperationStatus.SpeculativeSuccess) {
        throw new Error(`Operation failed with status ${status}`);
      }

      // 7. Pull the final events
      const events = await operation.getFinalEvents();
      const strategyCreated = events.find(e =>
        typeof e.data === 'string' &&
        /Strategy\s+(\w+)\s+created/.test(e.data)
      );
      if (!strategyCreated) {
        throw new Error('Creation event not found in logs');
      }

      // extract the ID (e.g. “Strategy XYZ created” → XYZ)
      const [, id] = /Strategy\s+(\w+)\s+created/.exec(strategyCreated.data)!;
      setStrategyId(id);

    } catch (err: any) {
      console.error(err);
      setError(`Failed to create strategy: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const fetchStrategyLogs = async (id: string) => {
    try {
      const logs = await getDeWebData(`dcaEvent_${id}`);
      setLogs(logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([{
        timestamp: Date.now(),
        data: `Error loading logs: ${(error as Error).message}`
      }]);
    }
  };

  useEffect(() => {
    if (strategyId) {
      fetchStrategyLogs(strategyId);
      
      // Refresh logs every 30 seconds
      const interval = setInterval(() => {
        fetchStrategyLogs(strategyId);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [strategyId]);

  return (
    <div className="strategy-form">
      <h3>Create DCA Strategy</h3>
      
      {error && <div className="error">{error}</div>}
      
      <button 
        onClick={createStrategy} 
        disabled={isCreating}
      >
        {isCreating ? 'Creating Strategy...' : 'Start $10 Daily ETH Purchase'}
      </button>
      
      {strategyId && (
        <div className="strategy-info">
          <h4>Strategy ID: {strategyId}</h4>
          <div className="logs">
            <h5>Activity Log:</h5>
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <span className="timestamp">
                    {new Date(log.timestamp).toLocaleString()}:
                  </span>
                  <span className="message">{log.data}</span>
                </div>
              ))
            ) : (
              <p>No activity yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}