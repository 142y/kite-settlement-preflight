import {networks, checkSettlement, isHexQuantity} from './check.js';
import {createRpc} from './rpc.js';

const [network = 'testnet', heightArg, ...extra] = process.argv.slice(2);
const height = heightArg !== undefined && /^(?:0|[1-9][0-9]*)$/.test(heightArg)
  ? '0x' + BigInt(heightArg).toString(16)
  : heightArg;
if (extra.length || !Object.hasOwn(networks, network) ||
    (height !== undefined && !isHexQuantity(height))) {
  console.error('Usage: node src/cli.js [testnet|mainnet] [decimal-or-hex-block-height]');
  process.exitCode = 2;
} else {
  try {
    const rpc = createRpc(process.env.KITE_RPC_URL ?? networks[network].rpc);
    console.log(JSON.stringify(await checkSettlement(network, rpc, height, process.env.KITE_EXPECTED_BYTECODE_SHA256), null, 2));
  } catch (error) {
    console.error(`Preflight failed: ${error.message}`);
    process.exitCode = 1;
  }
}
