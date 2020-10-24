# hardhat-etherscan

## Testing

This package contains a few integration tests that require specific environment variables to work:

- `RUN_ETHERSCAN_TESTS`: Should be set to `"yes"` to run the integration tests.
- `TESTNET_NETWORK_URL`: Should be set to the URL of a testnet ethereum node. Deployment transactions will be sent to this node. The chosen testnet should be supported by the Etherscan API.
- `WALLET_PRIVATE_KEY`: Should be set to a private key that holds some ether in the chosen testnet.
- `ETHERSCAN_API_KEY`: Should be set to a valid Etherscan API token key. This token will be used by the plugin when sending requests to the Etherscan API.
