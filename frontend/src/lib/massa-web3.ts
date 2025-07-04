import {
  JsonRpcProvider,
  JsonRpcPublicProvider,
  Args,
  Operation,
  Account,  // Required for JsonRpcProvider
  PublicAPI,
  PrivateKey
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

  await w.bearby.wallet.connect();

  const pubKey = await w.bearby.wallet.requestPubKey();

  const txPayload = {
    fee: "10000000", // Set reasonable fee in nanoMAS
    amount: coins.toString(),
    recipientAddress: scAddress,
    senderPublicKey: pubKey,
    functionName: funcName,
    parameter: args.serialize().toString(), // Must be hex encoded
  };

  // Ask BearBy to sign the transaction
  const signedTx = await w.bearby.wallet.signTransaction(txPayload);

  // Send the signed operation manually via JSON-RPC
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "sendOperations",
      params: [[signedTx]], // Array of signed operations
      id: 0,
    }),
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(`Failed to send operation: ${result.error.message}`);
  }

  return result.result; // usually the operation ID(s)
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
