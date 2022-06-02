# Network Helpers <!-- An Explanation: theoretical, not practica; for studying, not for working -->

<!-- What is it? -->
<!-- How can I use it? -->
<!-- Why would I want to use it? -->

[@nomicfoundation/hardhat-network-helpers](https://www.npmjs.com/package/@nomicfoundation/hardhat-network-helpers) provides convenience functions for working with Hardhat Network.

Hardhat Network exposes its custom functionality primarily through its JSON-RPC API. See the extensive set of methods available in [its reference documentation](../hardhat-network/reference#hardhat-network-methods). However, for easy-to-read tests and short scripts, interfacing with the JSON-RPC API produces noisy code with extensive conversions of both input and output data.

This package provides convenience functions for quick and easy interaction with Hardhat Network.

## Mining Blocks

<!--
mine()
mineUpTo()
-->

## Manipulating Accounts

<!--
setBalance()
setCode()
setNonce()
setStorageAt()
getStorageAt()
impersonateAccount()
stopImpersonatingAccount()
-->

## Time Helpers

<!--
latest()
latestBlock()
increase()
increaseTo()
setNextBlockTimestamp()
-->

## Snapshots

<!-- takeSnapshot() -->

## Fixtures

<!-- loadFixture() -->

## Dig Deeper

For a full listing of all of the helpers provided by this package, see [the reference documentation](./reference).
