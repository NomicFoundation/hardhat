# JS Benchmark Runner

## Run

To run:

```shell
pnpm install
pnpm run benchmark
```

The measurements will be printed stdout as machine-readable json and to stderr
as human-readable output.

## Grep

It's possible to grep the output to run a specific scenario:

```shell
npm run benchmark -- --grep seaport
```
