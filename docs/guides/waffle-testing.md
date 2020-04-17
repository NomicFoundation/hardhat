# Testing with ethers.js & Waffle

[Waffle](https://getwaffle.io/) is a simple smart contract testing library built on top of `ethers.js` that supports TypeScript. It's our recommended choice for testing.

Buidler allows you to use Waffle to test your smart contracts using the `@nomiclabs/buidler-waffle` plugin.

Let's see how to do this using the Buidler sample project.

Run these to start:
```
mkdir my-project
cd my-project
npm init --yes
npm install --save-dev @nomiclabs/buidler
```

Now run `npx buidler` inside your project folder and select `Create a sample project`. This is what the file structure should look like once you're done:

```
$ ls -l
total 296
drwxr-xr-x  378 fzeoli  staff   12096 Aug  7 16:12 node_modules/
drwxr-xr-x    3 fzeoli  staff      96 Aug  8 15:04 scripts/
drwxr-xr-x    3 fzeoli  staff      96 Aug  8 15:04 test/
drwxr-xr-x    3 fzeoli  staff      96 Aug  8 15:04 contracts/
-rw-r--r--    1 fzeoli  staff     195 Aug  8 15:04 buidler.config.js
-rw-r--r--    1 fzeoli  staff  139778 Aug  7 16:12 package-lock.json
-rw-r--r--    1 fzeoli  staff     294 Aug  7 16:12 package.json
```
Look at the `buidler.config.js` file and you'll see that the Waffle plugin is enabled:

<<< @/../packages/buidler-core/sample-project/buidler.config.js{1}

::: tip 
There's no need for `usePlugin("@nomiclabs/buidler-ethers")`, as `buidler-waffle` already does it.
:::

Look at the file `test/sample-test.js` and you'll find a sample test:

<<< @/../packages/buidler-core/sample-project/test/sample-test.js

You can run tests by running `npx buidler test`:
```
$ npx buidler test
All contracts have already been compiled, skipping compilation.


Contract: Greeter
    ✓ Should return the new greeting once it's changed (265ms)

  Greeter contract
    Deployment
      ✓ Should deploy with the right greeting (114ms)


  2 passing (398ms)
```

## Migrating an existing Waffle project

If you're starting a project from scratch and looking to use Waffle, you can skip this section. If you're setting up an existing Waffle project to use Buidler you'll need to migrate the [configuration options](https://ethereum-waffle.readthedocs.io/en/latest/configuration.html) Waffle offers. The following table maps Waffle configurations to their Buidler equivalents:
|Waffle|Buidler|
|---|---|
|`sourcesPath`|`paths.sources`|
|`targetPath`|`paths.artifacts`|
|`solcVersion`|`solc.version` (version number only)|
|`compilerOptions.evmVersion`|`solc.evmVersion`|
|`compilerOptions.optimizer`|`solc.optimizer`|

As an example, this Waffle configuration file:

```json
{
  "sourcesPath": "./some_custom/contracts_path",
  "targetPath": "../some_custom/build",
  "solcVersion": "v0.4.24+commit.e67f0147",
  "compilerOptions": {
    "evmVersion": "constantinople",
    "optimizer": {
      "enabled": true,
      "runs": 200
    }
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
    version: "0.4.24", // Note that this only has the version number
    evmVersion: "constantinople",
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
```

If you're migrating an existing Waffle project to Buidler, then the minimum configuration you'll need is changing Buidler's compilation output path, since Waffle uses a different one by default:

```js
usePlugin("@nomiclabs/buidler-waffle");

module.exports = {
  paths: {
    artifacts: "./build"
  }
};
```

## Adapting the tests

Now, when testing using a standalone Waffle setup, this is how the provider is initialized for testing:

```js
// legacy Waffle API
const provider = createMockProvider();

// new Waffle API
const provider = new MockProvider();
```

This initialization is already handled by `@nomiclabs/buidler-waffle`. Just be sure to include `usePlugin("@nomiclabs/buidler-waffle");` in your Buidler config and you'll be set. Run your tests with `npx buidler test` and you should get stack traces when a transaction fails.

[buidler evm]: ../buidler-evm/README.md


[Buidler Runtime Environment]: /documentation/#buidler-runtime-environment-bre
