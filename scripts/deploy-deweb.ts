import 'dotenv/config';
import { execSync } from 'child_process';
import * as path from 'path';

const RPC_URL = process.env.JSON_RPC_URL!;
const SECRET_KEY = process.env.MASSA_SECRET_KEY!;
const BUILD_DIR = path.resolve(__dirname, '../frontend/build');

if (!SECRET_KEY) {
  console.error('🚨 Error: MASSA_SECRET_KEY is not set');
  process.exit(1);
}

const cmd = [
  'npx @massalabs/deweb-cli upload',
  `"${BUILD_DIR}"`,
  `--node_url "${RPC_URL}"`
].join(' ');

console.log('🔄 Running DeWeb CLI:');
console.log(cmd);

try {
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, SECRET_KEY } // Pass SECRET_KEY as env var
  });
  console.log('✅ DeWeb CLI finished successfully');
} catch (err: any) {
  console.error('🚨 DeWeb CLI failed:', err.message);
  process.exit(1);
}
