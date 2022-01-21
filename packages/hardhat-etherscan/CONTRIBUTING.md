# Contributing to Hardhat Etherscan

The `hardhat-etherscan` plugin works with any explorer that is powered by Etherscan or that has a compatible verification API. This guide explains how to send a Pull Request that adds support for a new chain.

1. Update [types.ts](./src/types.ts) to include the new chain:
   - Add the chain as a new value in the `Chain` type.
2. Update [ChainConfig](./src/ChainConfig.ts) with the parameters for the chain you want to add:

   - Add an entry to the `chainConfig` object under the name you added to the `Chain` type
   - Under that `chainConfig` entry add the chain id. For example, if your network is called "fooChain" and its chain id is 1234, you need to add:

     ```jsx
     fooChain: {
       chainId: 1234,
       ...
     },
     ```

   - Add the proper URLs under the `chainConfig` chain entry. For example:

     ```jsx
     fooChain: {
       chainId: 1234,
       urls: {
         apiURL: "https://api.foochainscan.io/api",
         browserURL: "https://foochainscan.io",
       },
     },
     ```

     Here `apiURL` is the endpoint that corresponds to the API of the explorer, which will be used to send the verification request. `browserURL` is the URL of the explorer, that will be used to show a link after a successful verification. For this example, you would see a message with something like: `https://foochainscan.io/address/0xabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcde#code`

3. Update the snippet in the [`Multiple API keys...`](./README.md#multiple-api-keys-and-alternative-block-explorers) section of the README to include the added chain.
4. Send a pull request with these changes.
5. As part of the PR, and for each chain you are adding:
   - Indicate a public JSON-RPC endpoint that can be used for that chain.
   - Send some funds to this address: `0x4444c3F7D7d3153Dc0773C31ae10cf9B5495d4Bb`. These will be used by us to check that a contract can be deployed and verified with these changes. Don't send too much value, just enough to deploy a simple contract.
