# JS Benchmark Runner

## Run

To run:

```shell
pnpm install
pnpm run benchmark
```

The measurements will be printed to stdout as machine-readable json and to stderr and saved to `./benchmark-output.json` disk as json.

Please see `pnpm run help` for more.

### Anvil mode

1. Start anvil: `anvil --prune-history 256 --accounts 20 --code-size-limit 1048575`
    - `--prune-history 256` disables disk caching and limits memory cache to 256 past states
    - `--accounts 20` mimics HH behavior of using 20 genesis accounts instead of Anvil’s 10
    - The `--code-size-limit` is a way to mimic Hardhat’s allowUnlimitedContractSize option. The value is just an arbitrarily large number.
2. Run benchmark for specific scenario: `pnpm benchmark -g neptune --anvil`

