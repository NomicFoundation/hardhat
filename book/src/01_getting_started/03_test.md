# Test

Functionality in EDR is tested in two ways:

1. Rust unit & integration tests
2. End-to-end (E2E) tests of EDR in Hardhat

As EDR matures, we will gradually be moving over Hardhat E2E tests to granular unit & integration tests in EDR.

## EDR

Part of EDR's test suite requires a working internet connection. Those tests are marked with the `test-remote` feature flag.
EDR uses Alchemy as an Ethereum mainnet provider for its remote tests, which requires its API URL (including token) to be set in the `ALCHEMY_URL` environment variable.

To run all tests, including remote tests, execute:

```bash
cargo t --all-features
```

To only run local tests, execute:

```bash
cargo t --features bench-once,serde,std,tracing
```

The `bench-once` feature flag is used to ensure that benchmarks only run one iteration, to avoid taking too long.

## Hardhat

To validate that the port of Hardhat Node to EDR did not break any functionality, we implemented the EDR integration alongside the existing TypeScript code.
Each system in hidden behind an interface that allows us to either execute the original Hardhat implementation, EDR, or a dual-mode adapter that executes both implementations side-by-side and asserts that outputs are equal.

To switch modes, set the `HARDHAT_EXPERIMENTAL_VM_MODE` environment variable to one of: `ethereumjs`, `rethnet` (for EDR), or `dual` (default). E.g.:

```bash
cd packages/hardhat-core &&
HARDHAT_EXPERIMENTAL_VM_MODE=rethnet yarn test
```

Similar to EDR, Hardhat can be configured to run remote tests. This can be accomplished by setting environment variables for the API URL (including token) of Alchemy or Infura, respectively: `ALCHEMY_URL` and `INFURA_URL`.

Additionally, you can test Hardhat by using the EDR node as a provider directly. To enable the provider, set the `RETHNET_BINARY` environment variable to direct to the `rethnet` CLI binary.
