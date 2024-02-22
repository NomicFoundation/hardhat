# Tools

The `tools` crate contains various utilities useful for development.

## Benchmarking

Run the hardhat test command in a repo 5 times and report the times it took:

```bash
# From the repo root
 cargo run --bin tools benchmark -i 5 /repo/path -t "npx hardhat test"
```

## Compare test run execution times

Create a provider test execution report for the base branch:

```bash
# From packages/hardhat-core in the base branch
yarn build && yarn test:provider --reporter json | tee base-test-provider-logs.json
```

Create a provider test execution report for the candidate branch:

```bash
# From packages/hardhat-core in the candidate branch
yarn build && yarn test:provider --reporter json | tee candidate-test-provider-logs.json
```

Generate a comparison report that will list slower tests in the candidate branch:

```bash
# From the repo root
cargo run --bin tools compare-test-runs base-test-provider-logs.json candidate-test-provider-logs.json > comparisions.txt
```

## Scenarios

Scenarios can be used to collect and replay RPC requests which is useful for performance analysis.

### Collect scenario

1. Compile `edr_napi` with the `scenarios` feature
2. Set `EDR_SCENARIO_PREFIX` to the desired prefix for the scenario file name.
3. Execute a test suite with the `EDR_SCENARIO_PREFIX` environment variable set and the freshly compiled `edr_napi` version.
4. The scenario file will be written to the current working directory with the desired file name prefix.

### Run scenario

```bash
# From the repo root
cargo run --bin tools --release scenario <PATH_TO_SCENARIO_FILE>
```

The reported running time excludes reading the requests from disk and parsing them.
