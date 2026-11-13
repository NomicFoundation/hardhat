# Hardhat + ethers project

## Project layout

```
contracts/        Solidity source files (*.sol) and unit tests (*.t.sol)
test/             TypeScript integration tests and Solidity unit tests (*.sol)
ignition/         Hardhat Ignition deployment modules
scripts/          Standalone scripts run with `hardhat run`
hardhat.config.ts
```

## Working in this project

When writing or modifying tests, configuring `hardhat.config.ts`, or interacting with the network from TypeScript, invoke the **`hardhat`** skill. It covers Solidity and TypeScript testing, how to choose between them, `forge-std` cheatcodes, the `network.create()` API, `networkHelpers`, and the compile-then-typecheck workflow. The skill itself points to the matching `hardhat-toolbox-*` skill for toolbox-specific guidance (signers, contract interaction, assertions).

## TypeScript

Hardhat runs this project's TypeScript with Node.js's type stripping, as `package.json` sets `"hardhat": { "typescript": "node" }`. Node.js only removes the types, so:

- Use the `.ts` extension in relative imports, e.g. `import { deployCounter } from "./helpers.ts";`.
- Mark imports and re-exports of types with `type`, e.g. `import type { HardhatUserConfig } from "hardhat/config";`.
- Don't use TypeScript syntax that generates JavaScript: enums, namespaces with values, constructor parameter properties, `<T>` casts, or decorators. Node.js 22 also can't run `using` declarations.

`tsc --noEmit` reports these, except `.js` relative imports, decorators and `using` declarations.

## Docs

- Hardhat 3 — https://hardhat.org/llms.txt
- ethers.js — https://docs.ethers.org/v6/
