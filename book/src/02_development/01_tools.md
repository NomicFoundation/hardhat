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
