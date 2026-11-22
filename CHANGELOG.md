# Changelog

## 0.1.0 (unreleased)

Include a SHA-256 fingerprint of the deployed bytecode in each successful report.

Report the method and RPC error code on provider failures and suggest an archive
endpoint when the provider reports unavailable state.

Added an optional hex block height to reproduce saved settlement checks.

Initial CLI checks Kite network identity and settlement token deployment
and precision at a recorded block height.
