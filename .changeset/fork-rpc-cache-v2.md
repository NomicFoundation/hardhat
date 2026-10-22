---
"hardhat": patch
---

Changed the location of the forking RPC cache to an `rpc_cache/v2` subdirectory. Data cached by previous Hardhat versions is not reused. Everything else in the `rpc_cache` directory is ignored and can be deleted.
