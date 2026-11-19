import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {checkSettlement} from '../src/check.js';

const decimals = '0x' + '12'.padStart(64, '0');
const results = {eth_chainId: '0x940', eth_blockNumber: '0xab', eth_getCode: '0x6000', eth_call: decimals};

for (const [method, value, message] of [
  ['eth_chainId', '0x93e', /Expected chain/],
  ['eth_blockNumber', '0x00', /invalid hex/],
  ['eth_getCode', '0x', /bytecode/],
  ['eth_call', '0x12', /Malformed/],
  ['eth_call', '0x' + '6'.padStart(64, '0'), /Expected 18/]
]) {
  test(`rejects ${method} returning ${value}`, async () => {
    await assert.rejects(checkSettlement('testnet', key => key === method ? value : results[key]), message);
  });
}

for (const height of [undefined, '0x0', '0x1506209']) {
  test(`CLI reads the token at ${height ?? 'the current height'} over HTTP`, async t => {
    const calls = [];
    const server = createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const {method, params, id} = JSON.parse(Buffer.concat(chunks));
      calls.push([method, params]);
      res.end(JSON.stringify({id, jsonrpc: '2.0', result: results[method]}));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => server.close());
    const child = spawn(process.execPath, height === undefined ? ['src/cli.js'] : ['src/cli.js', 'testnet', height], {
      env: {...process.env, KITE_RPC_URL: 'http://127.0.0.1:' + server.address().port}
    });
    let output = '';
    child.stdout.on('data', chunk => output += chunk);
    const [status] = await once(child, 'close');
    assert.equal(status, 0);
    const token = '0x38129cf4CE5E183eFF248F42A7D345Bb1B47621A';
    assert.deepEqual(JSON.parse(output), {network:'testnet', chainId:2368, block:height ?? '0xab', token, decimals:18, bytecodeBytes:2});
    assert.deepEqual(calls, [
      ['eth_chainId', []], ...(height === undefined ? [['eth_blockNumber', []]] : []),
      ['eth_getCode', [token, height ?? '0xab']],
      ['eth_call', [{to:token, data:'0x313ce567'}, height ?? '0xab']]
    ]);
  });
}

test('invalid historical height is rejected before an RPC request', async () => {
  for (const height of ['', '-1', '0x00', 'latest', '0xgg']) {
    await assert.rejects(checkSettlement('testnet', () => assert.fail('unexpected RPC'), height), /hex quantity/);
  }
});
