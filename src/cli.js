import {networks, checkSettlement, isHexQuantity} from './check.js';
import {createRpc} from './rpc.js';

const args = process.argv.slice(2);
const usage = 'Usage: node src/cli.js [testnet|mainnet] [decimal-or-hex-block-height]';
const [network = 'testnet', heightArg, ...extra] = args;
const height = heightArg !== undefined && /^(?:0|[1-9][0-9]*)$/.test(heightArg)
  ? '0x' + BigInt(heightArg).toString(16)
  : heightArg;
if (args.length === 1 && ['--help', '-h'].includes(network)) {
  console.log(`${usage}

Check a Kite settlement token at the latest or specified block (default network: testnet).
Example: node src/cli.js testnet 22045354

KITE_RPC_URL                  Override the network RPC endpoint.
KITE_RPC_TIMEOUT_MS           Per-request timeout in milliseconds (default: 10000).
KITE_EXPECTED_BYTECODE_SHA256 Compare deployed bytecode with a 64-digit hex digest.

Exit codes: 0 success, 1 check or configuration failure, 2 invalid arguments.`);
} else if (extra.length || !Object.hasOwn(networks, network) ||
    (height !== undefined && !isHexQuantity(height))) {
  console.error(usage);
  process.exitCode = 2;
} else {
  try {
    const timeout = process.env.KITE_RPC_TIMEOUT_MS;
    const rpc = createRpc(process.env.KITE_RPC_URL ?? networks[network].rpc,
      timeout === undefined ? undefined : Number(timeout));
    console.log(JSON.stringify(await checkSettlement(network, rpc, height, process.env.KITE_EXPECTED_BYTECODE_SHA256), null, 2));
  } catch (error) {
    console.error(`Preflight failed: ${error.message}`);
    process.exitCode = 1;
  }
}
