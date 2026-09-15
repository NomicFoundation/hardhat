---
"@nomicfoundation/ignition-core": patch
---

Fixed a crash (`TypeError: Cannot read properties of null (reading 'startsWith')`) when a JSON-RPC server reported a failed `eth_call` without any usable return data. `decodeError` now treats a `null` return data the same as `"0x"`, returning a revert-without-reason result instead of throwing.
