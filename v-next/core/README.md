## Hardhat v-next's core

This package contains the new core of Hardhat, which includes its config and plugin system. It's WIP and still pretty unstable.

Some major things that are missing are:

- Port over the Hardhat errors structure
- Tests
- Custom global argumetns
- Its updated task system

## Examples

There are some examples of plugins, and a config file in `examples/`.

You can run them wit:

```sh
node examples/hardhat.js examples/example-config.ts
```

## Utilities

To analize the public API run `scripts/api-extractor.sh`, which will generate `dist/extracted-api.d.ts` with the entire API.

To analyze the files structure you can run `scripts/madge.sh`, which will generate the file `dependency-graph.png`.
