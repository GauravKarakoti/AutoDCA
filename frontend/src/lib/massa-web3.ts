import {
  JsonRpcProvider,
  JsonRpcPublicProvider,
  Args,
  Operation,
  Account,  // Required for JsonRpcProvider
  PublicAPI
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

// State-changing contract call
export async function callSC(
  account: Account,  // Required signing account
  scAddress: string,
  funcName: string,
  args: Args = new Args(),
  coins = 0n
): Promise<Operation> {
  const provider = new JsonRpcProvider(RPC_URL as unknown as PublicAPI, account);
  const op = await provider.callSC({
    target: scAddress,
    func: funcName,
    coins
  });
  return op;
}

// Fetch contract events
export async function getEvents(scAddress: string) {
  const p = initPublicProvider();
  return p.getEvents({ smartContractAddress: scAddress });  // Correct property name
}

export async function getAccounts(): Promise<Account[]> {
  if (typeof window !== 'undefined' && (window as any).massa) {
    return (window as any).massa.getAccounts();
  }
  throw new Error('Massa wallet extension not found');
}
