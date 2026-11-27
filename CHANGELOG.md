# Changelog

## 0.1.0 (unreleased)

Identify the failing method when an RPC endpoint returns an empty or non-JSON body.

Check the configured bytecode fingerprint before querying token decimals.

Make the per-request RPC deadline configurable and identify timed-out methods.

Accept decimal explorer block heights in the CLI and normalize them to hex for RPC reads.

Support an optional expected bytecode fingerprint for deployment checks.

Include a SHA-256 fingerprint of the deployed bytecode in each successful report.

Report the method and RPC error code on provider failures and suggest an archive
endpoint when the provider reports unavailable state.

Added an optional hex block height to reproduce saved settlement checks.

Initial CLI checks Kite network identity and settlement token deployment
and precision at a recorded block height.
