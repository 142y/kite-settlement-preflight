# Kite Settlement Preflight

Before deploying a Kite x402 payment service, check the RPC that the service
will use. This read-only CLI checks the chain ID, bytecode at the expected
settlement asset address and ERC-20 decimals. A testnet price configured at
mainnet precision can be off by twelve orders of magnitude.

## Run

Use Node.js 22 or later. From the project root, run the following commands.
All modules use the Node standard library.

~~~sh
npm run build
npm test
node src/cli.js testnet
node src/cli.js mainnet
~~~

To repeat a saved report, pass its hex block height or the equivalent decimal number from a block explorer:

~~~sh
node src/cli.js testnet 0x1506209
node src/cli.js testnet 22045193
~~~

Both asset reads use this height. Historical reads require a provider
that still serves the requested state. A missing historical state causes
the command to fail. If the provider reports missing state, set KITE_RPC_URL
to an archive endpoint and repeat the command at the same height.

The default network is testnet. Set KITE_RPC_URL to check a provider used by
your deployment, or use Node's environment file option.

~~~sh
cp .env.example .env
node --env-file=.env src/cli.js testnet
~~~

Successful runs print JSON containing the network, EIP-155 chain ID, hex
block height, asset address, observed decimals, deployed bytecode length and
`bytecodeSha256` (lowercase SHA-256 of the raw bytes at the token address).
Compare this field between reports for the same network and token to detect
bytecode changes even when the length stays the same. For proxy tokens the
fingerprint covers the proxy itself; its implementation can change independently.
Exit 0 means every check passed. Exit 1 reports an RPC or asset validation
failure to stderr. Exit 2 reports invalid CLI arguments.

Set `KITE_RPC_TIMEOUT_MS` to change the deadline for each RPC request,
including the response body. The default is 10000 milliseconds. For example,
`KITE_RPC_TIMEOUT_MS=3000 node src/cli.js testnet` gives each call three seconds.
A timeout names the method on stderr and exits with status 1.

## Checking an expected fingerprint

Set `KITE_EXPECTED_BYTECODE_SHA256` to the 64-digit hex digest from a trusted
baseline for the selected network and token. Both upper- and lowercase hex
are accepted. An invalid value or mismatch exits with status 1. A mismatch
reports the block and both fingerprints on stderr, so deployment jobs can
stop and an operator can reproduce the check. Leave the variable unset to
collect a report without comparing a baseline.

## Kite integration

Network profiles in src/check.js target testnet pieUSD (2368, 18 decimals)
and mainnet USDC.e (2366, 6 decimals). The program calls the configured
provider on every run. Asset selection follows the published network table.
[Network configuration](https://github.com/BrKDDD/kite-x402-hono/blob/main/src/networks.ts)

The check trusts the RPC's view of the selected height. A reorganization
can change that view. A successful response establishes contract presence
and matching precision. Payment authorization, facilitator availability
and settlement require independent verification.

See [architecture and operations](docs/ARCHITECTURE.md) and
[contribution guidelines](CONTRIBUTING.md). Licensed under Apache-2.0.
