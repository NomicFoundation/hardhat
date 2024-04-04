# EDR

[licence-badge]: https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue
[license]: COPYRIGHT

**EDR** is a debugging runtime for the Ethereum Virtual Machine (or EVM). It can be consumed as a Rust or as a Node.js native module.

## Building from Source

Make sure you have the following dependencies installed on your machine:

- [Rust](https://www.rust-lang.org/tools/install)

EDR is part of the [Hardhat monorepo](https://github.com/NomicFoundation/hardhat). Clone the source code using ssh:

```bash
git clone git@github.com:NomicFoundation/hardhat.git
```

or https:

```bash
git clone https://github.com/NomicFoundation/hardhat.git
```

Use `cargo` to build a release version:

```bash
cd hardhat
cargo build --release
```

## Building a Node.js native module

Make sure you have the following dependencies installed on your machine:

- [node.js](https://nodejs.org)

Use `pnpm` to build a release version:

```bash
cd crates/edr_napi
pnpm build
```
