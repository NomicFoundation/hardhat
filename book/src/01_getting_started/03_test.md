# Test

Functionality in EDR is tested in two ways:

1. Rust unit & integration tests
2. End-to-end (E2E) tests of EDR in Hardhat

As EDR matures, we will gradually be moving over Hardhat E2E tests to granular unit & integration tests in EDR.

## EDR

Part of EDR's test suite requires a working internet connection. 
Those tests are marked with the `test-remote` feature flag.
EDR uses both Alchemy and Infura as Ethereum mainnet providers for its remote tests. 
This requires their API URLs (including token) to be set in the `ALCHEMY_URL` and `INFURA_URL` environment variables.

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
yarn build &&
HARDHAT_EXPERIMENTAL_VM_MODE=rethnet yarn test
```

Similar to EDR, Hardhat can be configured to run remote tests. This can be accomplished by setting environment variables for the API URL (including token) of Alchemy or Infura, respectively: `ALCHEMY_URL` and `INFURA_URL`.

Additionally, you can test Hardhat by using the EDR node as a provider directly. To enable the provider, set the `RETHNET_BINARY` environment variable to direct to the `rethnet` CLI binary.

### Filtering Tests

Specific tests can be executed by filtering with the `--grep` or `-g` flag. E.g.:

```bash
yarn test -g "Reads from disk if available, not making any request a request"
```

will only run the test with this specific name.

Hierarchies of tests can be filtered by separating the levels with spaces. 
E.g. the test matching

```
Alchemy Forked provider
  hardhat_impersonateAccount
    hash collisions
```

can be run by using the following command:

```bash
yarn test -g "Alchemy Forked provider hardhat_impersonateAccount hash collisions"
```
