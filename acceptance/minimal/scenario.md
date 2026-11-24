---
packageManager: [npm, pnpm, bun]
---

# Initializing the minimal template

The `minimal` template is the smallest thing Hardhat will set up: a config file and the dependencies to run it, with no contracts and no tests.

It is the floor of the CLI's behaviour. `compile` has nothing to compile and `test` has nothing to run, and both should still succeed — a project with no work to do is not a project in an error state.

```sh
{{runRemote}} hardhat --init --template minimal

{{run}} hardhat compile
{{run}} hardhat test
```
