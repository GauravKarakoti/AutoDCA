import { useState, useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import { getAccounts, callSC } from './lib/massa-web3';
import './App.css';
import {Args } from '@massalabs/massa-web3';

const DCA_CONTRACT = "AS12c8P9ZCoW6Ae4t9v3v6yZiJ5tZMx5v7WcF1hq3RvHq1"; // Replace with actual address

function App() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  
  // Form state
  const [tokenIn, setTokenIn] = useState('USDC');
  const [tokenOut, setTokenOut] = useState('ETH');
  const [amount, setAmount] = useState('10');
  const [interval, setInterval] = useState('86400');
  const connectWallet = async () => {
    try {
      const accounts = await getAccounts();
      if (accounts.length > 0) {
        const walletAddress = accounts.toString();
        setWallet(walletAddress);
        setAccount(accounts[0]);
        localStorage.setItem('massa_wallet', walletAddress);
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      alert('Failed to connect wallet: ' + error.message);
    }
  };
  
  const createStrategy = async () => {
    if (!account) {
      alert('Please connect wallet first');
      return;
    }
    
    setIsCreating(true);
    try {
      const amountInCents = BigInt(Math.floor(parseFloat(amount) * 1e8));

      const args = new Args()
        .addString(tokenIn)                      // e.g. "USDC"
        .addString(tokenOut)                     // e.g. "ETH"
        .addU64(amountInCents)                   // uses U64 for numeric amounts
        .addU64(BigInt(parseInt(interval)));
      console.log("Everything set")
      await callSC(
        DCA_CONTRACT,
        'createStrategy',
        args
      );
      console.log("callsc called")
      
      alert('Strategy created successfully!');
    } catch (error: any) {
      console.error('Create strategy error:', error);
      alert('Failed to create strategy: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  if(!account) {
    connectWallet();
  }
  
  useEffect(() => {
    const savedWallet = localStorage.getItem('massa_wallet');
    if (savedWallet) {
      setWallet(savedWallet);
    }
  }, []);

  return (
    <div className="App">
      <header className="header">
        <h1>AutoDCA</h1>
        <p>Automated Dollar-Cost Averaging on Massa</p>
      </header>
      <WalletConnect onConnect={connectWallet} />
      
      {wallet && (
        <div className="strategy-form">
          <h2>Create New Strategy</h2>
          <p className="wallet-info">
            Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
            {!account && <span> (Reconnect to sign transactions)</span>}
          </p>
          
          <div className="form-group">
            <label>From Token</label>
            <select value={tokenIn} onChange={(e) => setTokenIn(e.target.value)}>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="MAS">MAS</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>To Token</label>
            <select value={tokenOut} onChange={(e) => setTokenOut(e.target.value)}>
              <option value="ETH">ETH</option>
              <option value="BTC">BTC</option>
              <option value="MAS">MAS</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Amount (USD)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.1"
            />
          </div>
          
          <div className="form-group">
            <label>Frequency</label>
            <select value={interval} onChange={(e) => setInterval(e.target.value)}>
              <option value="3600">Hourly</option>
              <option value="86400">Daily</option>
              <option value="604800">Weekly</option>
            </select>
          </div>
          
          <button 
            className="submit-btn" 
            onClick={createStrategy}
            disabled={isCreating || !account}
          >
            {isCreating ? 'Creating...' : 'Start DCA Strategy'}
          </button>
          
          <div className="gas-info">
            Estimated cost: ~0.01 MAS per trade
            {!account && <p>Wallet reconnection required to sign transaction</p>}
          </div>
        </div>
      )}
      
      {strategies.length > 0 && (
        <div className="strategies-list">
          <h3>Your Strategies</h3>
          {strategies.map(strategy => (
            <div key={strategy.id} className="strategy-card">
              <h4>{strategy.tokenIn} → {strategy.tokenOut}</h4>
              <p>${strategy.amountUSD} every {strategy.intervalText}</p>
              <p>Next execution: {strategy.nextExecution}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;