# Initializing the node:test and viem template

`--init` takes a `--template` and, given one, runs without asking anything: it takes the current directory as the workspace, writes the project files, and installs the dependencies itself.

The template named `node-test-runner-viem` sets up a project that tests with Node's own test runner and talks to the network through viem. It ships both a Solidity test and a TypeScript one, so a freshly initialized project has something to compile and something to run.

```sh
npx --yes hardhat --init --template node-test-runner-viem

npx hardhat compile
npx hardhat test
```
