---
"hardhat": patch
---

Added the `blockTimestamp` field to logs. Logs returned by `eth_getLogs`, `eth_getFilterLogs`, `eth_getFilterChanges` and `eth_subscribe("logs")` carry it, as do the logs in transaction receipts. When forking, the field is passed through from the remote node and is absent if the node does not serve it.
