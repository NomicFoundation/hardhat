---
"hardhat": minor
---

Added the `hhu` binary and the `hardhat utils` tasks, a set of small command-line utilities for ABI encoding, hashing, hex conversion, constants, and network queries. `hhu <namespace> <command>` is the same as `npx hardhat utils <namespace> <command>`. Projects or plugins that define their own `utils` task, or a global option named like a `utils` option or argument (such as `block` or `from`), need to rename it.
