import {networks, checkSettlement} from './check.js';
import {createRpc} from './rpc.js';

const [network = 'testnet', ...extra] = process.argv.slice(2);
if (extra.length || !Object.hasOwn(networks, network)) {
  console.error('Usage: node src/cli.js [testnet|mainnet]');
  process.exitCode = 2;
} else {
  try {
    const rpc = createRpc(process.env.KITE_RPC_URL ?? networks[network].rpc);
    console.log(JSON.stringify(await checkSettlement(network, rpc), null, 2));
  } catch (error) {
    console.error(`Preflight failed: ${error.message}`);
    process.exitCode = 1;
  }
}
