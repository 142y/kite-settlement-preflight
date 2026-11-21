export function createRpc(endpoint) {
  const url = new URL(endpoint);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('RPC URL requires HTTP or HTTPS');
  let sequence = 0;
  return async (method, params) => {
    const id = ++sequence;
    const response = await fetch(url, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({jsonrpc: '2.0', id, method, params}),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`${method} returned HTTP ${response.status}`);
    const body = await response.json();
    if (body?.jsonrpc !== '2.0' || body.id !== id || Object.hasOwn(body, 'error') === Object.hasOwn(body, 'result')) {
      throw new Error(`Invalid RPC reply for ${method}`);
    }
    if (Object.hasOwn(body, 'error')) {
      const error = body.error;
      if (!Number.isInteger(error?.code) || typeof error.message !== 'string') {
        throw new Error(`Invalid RPC reply for ${method}`);
      }
      const failure = `${method} returned RPC error ${error.code}`;
      if (['eth_getCode', 'eth_call'].includes(method) &&
          /missing trie node|historical state unavailable|state is not available/i.test(error.message)) {
        throw new Error(`${failure}: state unavailable at block ${params[1]}. Retry with an archive RPC endpoint.`);
      }
      throw new Error(failure);
    }
    return body.result;
  };
}
