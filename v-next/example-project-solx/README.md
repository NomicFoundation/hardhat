# Hardhat solx example project

This is an example Hardhat 3 project that uses the `hardhat-solx` plugin for test builds and test execution.

To use it you have to `cd` into this folder and run:

```sh
pnpm install
pnpm build
pnpm hardhat compile --build-profile test
```

This will compile the project using solx instead of solc via the `test` build profile that the plugin creates automatically.
