---
packageManager: [npm, pnpm, bun]
---

# Initializing the node:test and viem template

`--init` takes a `--template` and, given one, runs without asking anything: it takes the current directory as the workspace, writes the project files, and installs the dependencies itself, with the package manager that launched it.

The template named `node-test-runner-viem` sets up a project that tests with Node's own test runner and talks to the network through viem. It ships both a Solidity test and a TypeScript one, so a freshly initialized project has something to compile and something to run.

```sh
{{runRemote}} hardhat --init --template node-test-runner-viem

{{run}} hardhat compile
{{run}} hardhat test
```
