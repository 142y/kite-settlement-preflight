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
    if (body?.jsonrpc !== '2.0' || body.id !== id || body.error || !Object.hasOwn(body, 'result')) {
      throw new Error(`Invalid or unsuccessful RPC reply for ${method}`);
    }
    return body.result;
  };
}
