# Design

The plugin uses `forge config --json` to get Foundry's configuration and modify Hardhat's config, and to get the remappings. This has a performance hit, because the command has to be run synchronously so we can use it in `extendConfig`.

### Config

Hardhat's config is modified so that 1) the sources directory matches the one used by Foundry, and 2) the cache directory doesn't clash with Foundry's cache.

Notice that when Foundry is added to a Hardhat project, and the `foundry.toml` is created using `hre.config.paths`, then successive commands will take the config from Foundry's config. But this will just match the one that was already being used by Hardhat, which is what we want.

The plugin also detects the scenario where a user has _explicitly_ set a Hardhat sources directory that doesn't match the one used by Foundry. This can happen if the user modifies the sources path _after_ initializing the Foundry config. In this case, to silently override it would be wrong, so we throw an error.

### Compilation

Two things are done by the plugin to make compilation work:

- We use a subtask from Hardhat's `compile` task that can be used to transform the imports. This is done at the source name level, not by modifying the code. We override this task to transform imports using the remappings. So, when an import of `forge-std/console.sol` is processed, the source name used will be `lib/forge-std/src/console.sol`.
- A `remappings` entry is added to the solc input, that just includes Foundry's remappings.

To understand why both of these things are necessary, consider a library like this:

```
Directory structure:

  lib/foo/src/bar/Bar.sol
  lib/foo/src/qux/Qux.sol

With remappings:

  foo=lib/foo/src
  bar=lib/foo/src/bar
  qux=lib/foo/src/qux
```

In this scenario, `Bar.sol` should be able to import `Qux.sol` in any of two ways:

- `import "../qux/Qux.sol"`
- `import "qux/Qux.sol"`

If we use `bar/Bar.sol` as the source name in the solc input, then the first import won't work. If we use `lib/foo/src/bar/Bar.sol` as the source name, then the second import needs the remappings to be present in the solc input.
