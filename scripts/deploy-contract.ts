import 'dotenv/config';                      // loads JSON_RPC_URL & MASSA_SECRET_KEY
import { deploySC, WalletClient, ISCData } from '@massalabs/massa-sc-deployer';
import { readFileSync } from 'fs';

async function main() {
  const wallet = await WalletClient.getAccountFromSecretKey(
    process.env.MASSA_SECRET_KEY!
  );

  // pass `true` to wait for the first event + print it
  await deploySC(
    process.env.JSON_RPC_URL!,       // e.g. "https://buildnet.massa.net/api/v2"
    wallet,
    [
      {
        data:  readFileSync('./build/autodca.wasm'),
        coins: 0n,
      } as ISCData,
    ],
    77658366n,
    0n,              // fee
    100_000_000n,    // maxGas
    true             // ‹— wait/print events
  );
}

main().catch(console.error);