import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {createRpc} from '../src/rpc.js';

test('distinguishes unavailable state, other RPC errors and malformed replies', async t => {
  let reply;
  const server = createServer((req, res) => res.end(JSON.stringify(reply)));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const rpc = createRpc('http://127.0.0.1:' + server.address().port);
  let id = 0;
  for (const method of ['eth_getCode', 'eth_call']) {
    reply = {jsonrpc: '2.0', id: ++id, error: {code: -32000, message: 'missing trie node 123'}};
    await assert.rejects(rpc(method, [null, '0xab']), {message:
      `${method} returned RPC error -32000: state unavailable at block 0xab. Retry with an archive RPC endpoint.`});
  }
  reply = {jsonrpc: '2.0', id: ++id, error: {code: -32000, message: 'rate limited'}};
  await assert.rejects(rpc('eth_getCode', []), {message: 'eth_getCode returned RPC error -32000'});
  for (const fields of [{error: null}, {result: null, error: {code: -1, message: 'bad'}}, {}]) {
    reply = {jsonrpc: '2.0', id: ++id, ...fields};
    await assert.rejects(rpc('eth_getCode', []), {message: 'Invalid RPC reply for eth_getCode'});
  }
});

test('rejects timeouts outside the Node timer range', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, 2147483648]) {
    assert.throws(() => createRpc('http://localhost', value), /RPC timeout/);
  }
});

test('reports the RPC method and deadline when the response body stalls', async t => {
  const server = createServer((req, res) => {
    res.writeHead(200, {'content-type': 'application/json'});
    res.write('{');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const rpc = createRpc('http://127.0.0.1:' + server.address().port, 100);
  await assert.rejects(rpc('eth_chainId', []), {message: 'eth_chainId timed out after 100 ms'});
});
