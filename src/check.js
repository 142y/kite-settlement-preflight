export const networks = {
  testnet: {chainId: 2368, token: '0x38129cf4CE5E183eFF248F42A7D345Bb1B47621A', decimals: 18, rpc: 'https://rpc-testnet.gokite.ai'},
  mainnet: {chainId: 2366, token: '0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e', decimals: 6, rpc: 'https://rpc.gokite.ai'}
};

function quantity(value) {
  if (typeof value !== 'string' || !/^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value)) {
    throw new Error('RPC returned an invalid hex quantity');
  }
  return BigInt(value);
}

export async function checkSettlement(network, rpc) {
  const {chainId, token, decimals} = networks[network];
  const actualChain = quantity(await rpc('eth_chainId', []));
  if (actualChain !== BigInt(chainId)) throw new Error(`Expected chain ${chainId}, received ${actualChain}`);
  const block = await rpc('eth_blockNumber', []);
  quantity(block);
  const code = await rpc('eth_getCode', [token, block]);
  if (typeof code !== 'string' || !/^0x(?:[0-9a-f]{2})+$/i.test(code)) {
    throw new Error(`Missing or malformed token bytecode at block ${block}`);
  }
  const result = await rpc('eth_call', [{to: token, data: '0x313ce567'}, block]);
  if (typeof result !== 'string' || !/^0x[0-9a-f]{64}$/i.test(result)) throw new Error('Malformed decimals() response');
  if (BigInt(result) !== BigInt(decimals)) throw new Error(`Expected ${decimals} decimals, received ${BigInt(result)}`);
  return {network, chainId, block, token, decimals, bytecodeBytes: (code.length - 2) / 2};
}
