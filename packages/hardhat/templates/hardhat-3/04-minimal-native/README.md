# Sample Hardhat 3 Project (minimal, native TypeScript)

This project has a minimal setup of Hardhat 3, without any plugins, and runs
TypeScript using Node.js' built-in type stripping — no `tsx` or other
transpiler is installed.

## What's included?

The project includes native TypeScript support, Hardhat scripts, tasks, and
support for Solidity compilation and tests.

## Native TypeScript support

This project sets `"hardhat": { "typescriptSupport": "native" }` in its
`package.json`, so Hardhat loads `hardhat.config.ts`, scripts and tasks via
Node.js' built-in type stripping. This requires Node.js 22.18 or later (or 23.6
or later), where type stripping is enabled by default.

The `tsconfig.json` enables `erasableSyntaxOnly`, so TypeScript reports an error
if you use a construct that Node.js can't strip (such as enums or parameter
properties).

If you need those constructs, or you're on an older Node.js version, set
`"hardhat": { "typescriptSupport": "tsx" }` and install `tsx` as a development
dependency instead.
