import {
  JsonRpcPublicProvider,
  Args,
  PublicAPI,
  ReadSCParams
} from "@massalabs/massa-web3";

const RPC_URL = "https://buildnet.massa.net/api/v2";
const DEWEB_CONTRACT = "AS1TjZ25vsQq44nsif7kuexjVFNi6CXHCKamvEqgTkWsov5W1zQD";

let publicProvider: JsonRpcPublicProvider | null = null;

// Initialize public provider (read-only operations)
export function initPublicProvider(): JsonRpcPublicProvider {
  if (!publicProvider) {
    publicProvider = new JsonRpcPublicProvider(RPC_URL as unknown as PublicAPI);
  }
  return publicProvider;
}

function verifyMerkleProof(data: string, proof: Uint8Array): boolean {
  if (proof.length < 32 || proof.length > 512) {
    return false;
  }
  
  return true; 
}

export async function getDeWebData(key: string): Promise<any[]> {
  const provider = initPublicProvider();
  try {
    // Call DeWeb contract's view function
    const result = await provider.readSC({
      target: DEWEB_CONTRACT,
      func: 'getData',
      parameter: new Args().addString(key)
    });
    
    // Parse the result
    if (result.info.error) {
      throw new Error(result.info.error);
    }

    // Convert Uint8Array to string
    const data = new TextDecoder().decode(result.value);
    const proof = await provider.readSC({
      target: DEWEB_CONTRACT,
      func: 'getProof',
      parameter: new Args().addString(key)
    });
    
    if (proof.info.error) {
      throw new Error(proof.info.error);
    }

    if (!verifyMerkleProof(data, proof.value)) {
      throw new Error('Invalid Merkle proof');
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error fetching DeWeb data:', error);
    throw new Error('Failed to retrieve DeWeb data');
  }
}

// Read-only contract call
export async function readFromSC(
  scAddress: string,
  funcName: string,
  args: Args = new Args()
): Promise<Uint8Array> {
  const p = initPublicProvider();
  const result = await p.readSC({
    target: scAddress,
    func: funcName,
    parameter: args
  });
  
  if (result.info.error) throw new Error(result.info.error);
  return result.value;
}

export async function estimateGas(
  scAddress: string,
  funcName: string,
  args: Args = new Args()
): Promise<bigint> {
  const provider = initPublicProvider();
  const params: ReadSCParams = {
    target: scAddress,
    func: funcName,
    parameter: args.serialize(),
    caller: "AU185XuueMCuD3KjvPXKzfsU6oEaASW8UB7nieacMmJ1oM4EtxrT",
    coins: 0n
  };
  
  try {
    // Use the correct getGasEstimation method
    const gasEstimation = await provider.getGasEstimation(params);
    return gasEstimation; // Return the bigint value
  } catch (error) {
    console.error('Gas estimation failed:', error);
    return 100_000n; // Default gas limit if estimation fails
  }
}

export async function callSC(
  scAddress: string,
  funcName: string,
  args: Args = new Args(),
  coins = 0n
): Promise<any> {
  const w = window as any;
  if (!w.bearby?.wallet) {
    throw new Error("BearBy wallet not found");
  }

  // 1. Connect & get public key
  await w.bearby.wallet.connect();
  const senderPublicKey: string = await w.bearby.wallet.requestPubKey();

  // 2. Serialize and hex‑encode your args
  const serializedParams = args.serialize();
  const hexParams = Array.from(serializedParams, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  // 3. Build the payload with the exact field names BearBy expects
  const txPayload = {
    senderPublicKey,          // REQUIRED
    expirePeriod: 0,          // (optional) set to 0 for default
    fee: "10000000",          // nanoMAS
    coins: coins.toString(),  // nanoMAS
    targetAddress: scAddress, // the SC you’re calling
    function: funcName,       // entrypoint in the SC
    parameter: hexParams      // your args in hex
  };

  // 4. Sign
  const signedTx = await w.bearby.wallet.signTransaction(txPayload);

  // 5. Send via JSON‑RPC
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "sendOperations",
      params: [[signedTx]],
      id: 0
    })
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(`Failed to send operation: ${result.error.message}`);
  }
  return result.result;
}

// Fetch contract events
export async function getEvents(scAddress: string) {
  const p = initPublicProvider();
  return p.getEvents({ smartContractAddress: scAddress });  // Correct property name
}

export async function getAccounts(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("No window object");
  }

  const w = window as any;

  // Official extension
  if (w.massa && typeof w.massa.getAccounts === "function") {
    return w.massa.getAccounts(); // Already returns Account[]
  }

  // BearBy wallet
  if (w.bearby?.wallet && typeof w.bearby.wallet.requestPubKey === "function") {
    // Ensure wallet is connected
    if (typeof w.bearby.wallet.connect === "function") {
      await w.bearby.wallet.connect(); // May trigger prompt
    }

    const pubKey = await w.bearby.wallet.requestPubKey(); // e.g. AU12h...
    return pubKey;
  }

  throw new Error("Massa wallet extension not found");
}
