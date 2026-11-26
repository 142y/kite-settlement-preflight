import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {spawn, spawnSync} from 'node:child_process';
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

for (const [input, height] of [
  [undefined, undefined], ['0x0', '0x0'], ['0x1506209', '0x1506209'],
  ['0', '0x0'], ['171', '0xab'], ['9007199254740993', '0x20000000000001']
]) {
  test(`CLI reads the token at ${input ?? 'the current height'} over HTTP`, async t => {
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
    const child = spawn(process.execPath, input === undefined ? ['src/cli.js'] : ['src/cli.js', 'testnet', input], {
      env: {...process.env, KITE_EXPECTED_BYTECODE_SHA256: 'f3df0a62b10f205b0f29768aa3d69e777154caaa179f64aabb0a4899c666b017', KITE_RPC_URL: 'http://127.0.0.1:' + server.address().port}
    });
    let output = '';
    child.stdout.on('data', chunk => output += chunk);
    const [status] = await once(child, 'close');
    assert.equal(status, 0);
    const token = '0x38129cf4CE5E183eFF248F42A7D345Bb1B47621A';
    assert.deepEqual(JSON.parse(output), {network:'testnet', chainId:2368, block:height ?? '0xab', token, decimals:18, bytecodeBytes:2,
      bytecodeSha256:'f3df0a62b10f205b0f29768aa3d69e777154caaa179f64aabb0a4899c666b017'});
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

test('fingerprints raw bytecode independently of hex case and code length', async () => {
  const report = code => checkSettlement('testnet', method => method === 'eth_getCode' ? code : results[method]);
  const first = await report('0x60ab');
  const same = await report('0x60AB');
  const changed = await report('0x60ac');
  assert.equal(first.bytecodeSha256, same.bytecodeSha256);
  assert.equal(first.bytecodeBytes, changed.bytecodeBytes);
  assert.notEqual(first.bytecodeSha256, changed.bytecodeSha256);
});

test('compares configured fingerprints against the observed code', async () => {
  const rpc = method => results[method];
  const observed = await checkSettlement('testnet', rpc);
  assert.deepEqual(await checkSettlement('testnet', rpc, undefined, observed.bytecodeSha256.toUpperCase()), observed);
  await assert.rejects(checkSettlement('testnet', rpc, undefined, '0'.repeat(64)), /mismatch on testnet at block 0xab/);
});

test('malformed expected fingerprint fails before any RPC requests', async () => {
  for (const pin of ['', '0x' + 'a'.repeat(64), 'z'.repeat(64)]) {
    await assert.rejects(checkSettlement('testnet', () => assert.fail('unexpected RPC'), undefined, pin), /64 hex digits/);
  }
  const child = spawnSync(process.execPath, ['src/cli.js'], {
    env: {...process.env, KITE_EXPECTED_BYTECODE_SHA256: 'bad', KITE_RPC_URL: 'http://127.0.0.1:1'},
    encoding: 'utf8'
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /64 hex digits/);
  assert.equal(child.stdout, '');
});

test('CLI rejects ambiguous and fractional block numbers', () => {
  for (const input of ['01', '1.5', '-10', '1e3']) {
    const child = spawnSync(process.execPath, ['src/cli.js', 'testnet', input], {encoding: 'utf8'});
    assert.equal(child.status, 2);
    assert.match(child.stderr, /Usage/);
  }
});

test('reports a code mismatch before querying decimals on the unexpected contract', async () => {
  const methods = [];
  const rpc = method => {
    methods.push(method);
    if (method === 'eth_call') throw new Error('decimals() unavailable');
    return results[method];
  };
  await assert.rejects(checkSettlement('testnet', rpc, '0xab', '0'.repeat(64)), /SHA-256 mismatch/);
  assert.deepEqual(methods, ['eth_chainId', 'eth_getCode']);
});
