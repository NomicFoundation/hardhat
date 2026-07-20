---
"@nomicfoundation/ignition-core": patch
---

Fix an off-by-one in the nonce-sync confirmation check that could treat a user's replacement transaction as fully confirmed when it had one fewer than the required number of confirmations. A transaction count is a cardinality (the next nonce to use), so the transaction with a given nonce is only confirmed at the safe block when the safe count is strictly greater than the nonce; the check now uses `>` instead of `>=`.
