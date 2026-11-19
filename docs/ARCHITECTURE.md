# Architecture and operations

src/cli.js selects the profile and translates success or failure into a
process exit code. src/rpc.js sends JSON-RPC 2.0 requests with matching IDs
and a ten-second deadline per request. src/check.js reads the chain ID,
then uses the supplied hex height or queries the latest height. Both eth_getCode and the decimals() eth_call use
that height. A failed check stops the sequence.

Run npm test from the project root. The tests use synthetic replies for
wrong-network, empty-code, malformed-quantity, ABI and precision cases.
The integration test starts a local HTTP server and invokes the CLI as a
subprocess to verify the wire requests and exit status. For a live check,
run node src/cli.js testnet. The latest block and code size may vary.

Deploy the source directory and package.json on a machine with Node 22+.
Run npm run build for syntax checks and npm test before running the CLI in a
deployment job. Capture stdout for the success report and stderr for failures.
If the endpoint times out, check provider connectivity. On chain mismatch,
check the endpoint and network argument. For empty code or a failed call,
check the deployment address against the current Kite asset configuration
and confirm the provider supports state reads at the requested block height.
