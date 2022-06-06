# Network Helpers <!-- An Explanation: theoretical, not practica; for studying, not for working -->

<!-- What is it? -->
<!-- How can I use it? -->
<!-- Why would I want to use it? -->

[@nomicfoundation/hardhat-network-helpers](https://www.npmjs.com/package/@nomicfoundation/hardhat-network-helpers) provides convenience functions for working with [Hardhat Network](/hardhat-network).

Hardhat Network exposes its custom functionality primarily through its JSON-RPC API. See the extensive set of methods available in [its reference documentation](../hardhat-network/reference#hardhat-network-methods). However, for easy-to-read tests and short scripts, interfacing with the JSON-RPC API is too noisy, requiring a verbose syntax and extensive conversions of both input and output data.

This package provides convenience functions for quick and easy interaction with Hardhat Network. Facilities include the ability to mine blocks up to a certain timestamp or block number, the ability to manipulate attributes of accounts (balance, code, nonce, storage), the ability to impersonate specific accounts, and the ability to take and restore snapshots.

For a full listing of all of the helpers provided by this package, see [the reference documentation](/network-helpers/reference).
