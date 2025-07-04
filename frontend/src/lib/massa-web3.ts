import {
  JsonRpcPublicProvider,
  Args,
  PublicAPI,
} from "@massalabs/massa-web3";

const RPC_URL = "https://buildnet.massa.net/api/v2";

let publicProvider: JsonRpcPublicProvider | null = null;

// Initialize public provider (read-only operations)
export function initPublicProvider(): JsonRpcPublicProvider {
  if (!publicProvider) {
    publicProvider = new JsonRpcPublicProvider(RPC_URL as unknown as PublicAPI);
  }
  return publicProvider;
}

// Read-only contract call
export async function readFromSC(
  scAddress: string,
  funcName: string,
  args: Args = new Args()
): Promise<Uint8Array> {
  const p = initPublicProvider();
  const { value, info } = await p.readSC({
    target: scAddress,
    func: funcName,
  });
  if (info.error) throw new Error(info.error);
  return value;
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
