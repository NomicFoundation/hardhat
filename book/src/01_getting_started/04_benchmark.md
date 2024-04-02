# Benchmark

We take two approaches to benchmarking EDR:

1. Automated benchmarks using `criterion`
2. Manual benchmarks using repositories of dependants

## Automated

## Manual

To measure real-world performance, we use a build of [Hardhat](https://github.com/NomicFoundation/hardhat) with EDR in third-party projects.
To make a local build of Hardhat available for linking in other packages, run:

```bash
cd packages/hardhat-core &&
pnpm build &&
npm link
```

For this example we will use [openzeppelin-contracts](https://github.com/OpenZeppelin/openzeppelin-contracts):

```bash
git clone https://github.com/OpenZeppelin/openzeppelin-contracts.git &&
cd openzeppelin-contracts &&
npm install
```

To use your local hardhat build in a third-party project, run:

```bash
npm link hardhat
```

To validate that this worked, you can run:

```bash
file node_modules/hardhat
```

The expected output will look similar to this:

```bash
node_modules/hardhat: symbolic link to ../../hardhat/packages/hardhat-core
```

To prevent the benchmark from being tainted by smart contract compilation, we first run:

```bash
npx hardhat compile
```

Finally, to benchmark the third-party project, we time its test suite.
For example:

```bash
time npx hardhat test
```

Resulting in output similar to:

```bash
npx hardhat test  68.99s user 9.59s system 130% cpu 1:00.40 total
```
