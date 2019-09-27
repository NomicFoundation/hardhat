# Testing with ethers.js & Waffle

[Waffle](https://getwaffle.io/) is a simple smart contract testing library built on `ethers.js` that supports TypeScript. It's our recommended choice for testing. 

This guide will cover setting up a Buidler project to use Waffle and TypeScript, and to do so we will pick up from the [TypeScript Support](/guides/typescript.md) guide. Follow that guide to setup your TypeScript project and come back.

Done? Great. Let's now install `ethers.js` and the `buidler-ethers` plugin, which will allow Waffle to use [Buidler EVM] and get stack traces functionality.

```
$ npm install @nomiclabs/buidler-ethers ethers
```

Add the ethers type extensions to your `tsconfig.json` that you should've created following the TypeScript guide:
```json{12}
{
  "compilerOptions": {
    "target": "es5",  
    "module": "commonjs",
    "strict": true,      
    "esModuleInterop": true,
    "outDir": "dist"
  },
  "include": ["./scripts", "./test"],
  "files": [
    "./buidler.config.ts",
    "./node_modules/@nomiclabs/buidler-ethers/src/type-extensions.d.ts"
  ]
}
```

And let's enable the `buidler-ethers` plugin in `buidler.config.ts`:
```js
usePlugin("@nomiclabs/buidler-ethers");

module.exports = {};
```

## Migrating an existing Waffle project
If you're starting a project from scratch and looking to use Waffle, you can skip this section. If you're setting up an existing Waffle project to use Buidler you'll need to migrate the [configuration options](https://ethereum-waffle.readthedocs.io/en/latest/configuration.html) Waffle offers. The following table maps Waffle configurations to their Buidler equivalents:
|Waffle|Buidler|
|---|---|
|`sourcesPath`|`paths.sources`|
|`sourcesPath`|`paths.sources`|
|`targetPath`|`paths.artifacts`|
|`solcVersion`|`solc.version`|
|`compilerOptions.evmVersion`|`solc.evmVersion`|
|`compilerOptions.optimizer`|`solc.optimizer`|

As an example, this Waffle configuration file:

```js
{
  sourcesPath: "./some_custom/contracts_path",
  targetPath: "../some_custom/build",
  solcVersion: "v0.4.24+commit.e67f0147",
  compilerOptions: {
    evmVersion: "constantinople",
    optimizer: true
  }
}
```

Would translate into this Buidler config:
```js
module.exports = {
  paths: {
    sources: "./some_custom/contracts_path",
    artifacts: "../some_custom/build"
  },
  solc: {
    version: "v0.4.24",
    evmVersion: "constantinople",
    optimizer: true
  }
};
```

If you're migrating an existing Waffle project to Buidler, then the minimum configuration you'll need is changing Buidler's compilation output path, since Waffle uses a different one by default:

```js
usePlugin("@nomiclabs/buidler/ethers");

module.exports = {
  paths: {
      artifacts: "./build",
    }
};
```
## Connecting Waffle and Buidler EVM
Next we'll tweak the configuration to synchronize Waffle's default accounts with [Buidler EVM]. Soon this will be handled by a Waffle integration plugin.

```js
usePlugin("@nomiclabs/buidler-ethers");

const waffleDefaultAccounts = require("ethereum-waffle/dist/config/defaultAccounts").default;

module.exports = {
  paths: {
    artifacts: "./build",
  },
  networks: {
    buidlerevm: {
      accounts: waffleDefaultAccounts.map(acc => ({
        balance: acc.balance,
        privateKey: acc.secretKey
      }))
    }
  }
};
```

## Adapting the tests

Now, when testing using a standalone Waffle setup, this is how the provider is initialized for testing:
```js
const provider = createMockProvider();
```
To use Waffle with Buidler you should do this instead:
```js
import { ethers } from "@nomiclabs/buidler";
const provider = ethers.provider
```

And you're set. Run your tests with `npx buidler test` and you should get stack traces when a transaction fails.

[Buidler EVM]: /reference/buidlerevm.md