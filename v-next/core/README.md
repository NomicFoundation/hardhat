# Hardhat v-next's core

This package contains the new core of Hardhat, which includes:

- The config system
- The configuration variables system
- The plugin system
- The global arguments system
- The hooks system
- The tasks system
- The user interruptions system

This package is not meant to be used directly. Use `hardhat` instead.

## Utilities

To analize the public API run `scripts/api-extractor.sh`, which will generate `dist/extracted-api.d.ts` with the entire API.

To analyze the files structure you can run `scripts/madge.sh`, which will generate the file `dependency-graph.png`.
