# Hardhat solx example project

This is an example Hardhat 3 project that uses the `hardhat-solx` plugin.

To use it you have to `cd` into this folder and run:

```sh
pnpm install
pnpm build
pnpm hardhat compile --build-profile solx
```

This will compile the project using solx instead of solc via the `solx` build profile defined in `hardhat.config.ts`.

To compile with the default solc profile:

```sh
pnpm hardhat compile
```
