# Migrating a plugin from Buidler to hardhat

This is a short guide explaining how to turn a Buidler plugin into a Hardhat one.

If you want a complete example of a Hardhat plugin, take a look at [this repository](https://github.com/nomiclabs/hardhat-ts-plugin-boilerplate/).

## Updating its dependencies

### Core package

References to the `@nomiclabs/buidler` package should be replaced with the `hardhat` package in your `package.json`, and your `import`s or `require`s.

For example, you would import the `extendEnvironment` function this way:

```typescript
import { extendEnvironment } from "hardhat/config";
```

### Plugins

Similarly, references to Buidler plugins should be replaced with their corresponding Hardhat plugins. For example, `@nomiclabs/buidler-ethers` would be `@nomiclabs/hardhat-ethers`.

## Adapting your plugin's source code

Replace all types or imported names that include `Buidler` with `Hardhat` in your plugin source code.

For example, the `BuidlerRuntimeEnvironment` should be replaced with the `HardhatRuntimeEnvironment`. We suggest using `hre` instead of `bre` as its variable name.

### Artifacts

The `readArtifact` and `readArtifactSync` functions were moved to the `HardhatRuntimeEnvironment` so you must replace their uses like this:

```js
const tokenArtifact = await hre.artifacts.readArtifact("Token");
```

The artifact format is now supplemented with build information and debug artifacts in Hardhat which allows you to read things like contract symbols. See the [documentation](../guides/compile-contracts#artifacts) for more information.

## Updating your plugin's tests

Apart from updating types and names, fixture projects need their `buidler.config.js` renamed to `hardhat.config.js`.

### Changes needed to your test project's config

The compiler configuration is now expected in the `solidity` field instead of `solc`. Note that Hardhat projects allow multiple solidity versions in its compilation pipeline. For more information see its [documentation](../guides/compile-contracts.md).

Besides that, the compiler settings now go inside a `settings` field. For example, a configuration like this:

```
module.exports = {
    solc: {
        version: "0.7.2"
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
}
```

needs to be replaced with this:

```js
module.exports = {
  solidity: {
    version: "0.7.2",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
```

## Adapting your type extensions

Hardhat introduced a few changes in how type extensions are created and used.

These are the necessary changes to update your plugin.

First, you need rename your `src/type-extensions.d.ts` file to `src/type-extensions.ts`.

Then, you need to add an `import "./type-extensions";` in your `src/index.ts` file, or the main entrypoint to your plugin as defined in your `package.json`.

### Extending Hardhat types

Hardhat types are meant to be imported from `hardhat/types`, but when extending them, you should import them from the module that declares them.

For example, if you want you use the `HardhatRuntimeEnvironment` type, you should import it with:

```typescript
import { HardhatRuntimeEnvironment } from "hardhat/types";
```

But if you want to extend it, you should import the module that declares it instead, which is `hardhat/types/runtime`.

```typescript
import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    newField: number;
  }
}
```

### Adapting your config extensions

Config types are handled slightly differently in Hardhat.

For each config element/type, there are two Typescript types defined. One ends with `UserConfig`; it represents the user's input is used by users when writing their config. The other ends with just `Config`; it represents the configuration values after any resolution and default values have been applied, and it's used during the execution of tasks, tests and scripts, and is present in the Hardhat Runtime Environment.

For example, `HardhatUserConfig` represents the entire config written by the user, and all of its fields are optional. `HardhatConfig`, is the result of resolving/normalizing it, and applying default values. None of its fields are optional.

Some types have been renamed to match this new pattern:

- `ProjectPaths` is now `ProjectPathsUserConfig`
- `Networks` is now `NetworksUserConfig`
- Both have their resolved versions: `ProjectPathsConfig` and `NetworksConfig`, respectively.

You can find an example of how to properly extend these types, resolve/normalize the users's config, and apply default values in the `src/type-extensions.ts` and `src/index.ts` files.

### How type extensions are loaded in Hardhat

Previously, type extensions were loaded by plugin users by adding references to a plugin-owned `type-extensions.d.ts` in their `tsconfig.json`.

Now, they're loaded automatically when importing the plugin in a hardhat config file. For example:

```typescript
import "@nomiclabs/hardhat-ethers";
```

This is enough to import the type extensions included in the `@nomiclabs/hardhat-ethers` plugin.

## Adapting your `README.md`

Make sure to update the README to point to the new Hardhat site (https://hardhat.org), and that the Typescript Support section has been updated.
