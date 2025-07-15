# AutoDCA - Trustless Dollar-Cost Averaging

> Fully autonomous DCA powered by Massa’s Autonomous Smart Contracts.

Frontend deployed at `AS1TjZ25vsQq44nsif7kuexjVFNi6CXHCKamvEqgTkWsov5W1zQD`

## 🔍 Overview
AutoDCA automates crypto investments using Massa’s ASCs. Set recurring buys (e.g., "Swap $10 USDC → ETH daily"), and the protocol executes trades trustlessly—no intermediaries.

## ✨ Features
- **Autonomous Execution**: Trades triggered on-chain via Massa’s deferred calls.
- **DeWeb Hosting**: Frontend lives on Massa blockchain (no central servers).
- **Non-Custodial**: Users retain control of funds until swap execution.
- **Real-Time Tracking**: Monitor strategy history and performance.

## 🛠️ Setup
### Prerequisites
- Node.js ≥ 18.x
- Massa Station Wallet
- Massa LocalNet (for testing)

### Installation
1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/autodca.git
   ```
2. Install dependencies:
   ```bash
   cd autodca && npm install
   ```
3. Deploy contracts to Massa Testnet:
   ```bash
   npm run deploy:contracts
   ```
4. Deploy frontend to DeWeb:
   ```
   npm run deploy:deweb
   ```

### 📖 Usage
1. Visit the DeWeb-hosted UI (URL logged after deployment).
2. Connect your Massa Station wallet.
3. Create a strategy:
  - Select tokens (e.g., USDC → ETH).
  - Set amount/frequency (e.g., $10 every 24 hours).
  - Deposit funds.
4. View active strategies and execution history.

### ⚙️ Tech Stack
- **Smart Contracts**: AssemblyScript (Massa-SC-STD)
- **Frontend**: React + TypeScript
- **Deployment**: Massa DeWeb & LocalNet
