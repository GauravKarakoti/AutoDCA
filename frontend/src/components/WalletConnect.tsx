import { getWallets } from '@massalabs/wallet-provider';

export interface WalletConnectProps {
  onConnect: () => Promise<void>;
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const connect = async () => {
    try {
      // 1. Get available wallet providers
      const wallets = await getWallets();
      
      if (wallets.length === 0) {
        throw new Error('No Massa wallets detected. Install Massa Station or compatible wallet');
      }
      
      // 2. Use first available wallet (e.g., Massa Station)
      const wallet = wallets[0];
      
      // 3. Request accounts from wallet
      const accounts = await wallet.accounts();
      
      if (accounts.length > 0) {
        localStorage.setItem('massa_wallet', accounts[0].address);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  return (
    <button onClick={connect} className="connect-btn">
      {localStorage.getItem('massa_wallet') 
        ? `Connected: ${localStorage.getItem('massa_wallet')?.slice(0, 6)}...` 
        : 'Connect Wallet'}
    </button>
  );
}