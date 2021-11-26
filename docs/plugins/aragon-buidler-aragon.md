---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/aragon/buidler-aragon/tree/master)
:::

# Aragon Buidler plugin

Buidler plugin for developing Aragon apps with full front end and back end hot reloading.

### Required plugins

This plugin currently requires:

- [**buidler-truffle5**](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5)
- [**buidler-web3**](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3)
- [**buidler-etherscan**](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-etherscan)

### Installation

```
yarn add --dev @aragon/buidler-aragon @nomiclabs/buidler-truffle5 @nomiclabs/buidler-web3 web3
```

And add the following statement to your buidler.config.js:

```js
usePlugin('@aragon/buidler-aragon')
```

### Tasks

#### Start task

This plugin provides the "start" task, which allows you to develop an application while visualizing it in the browser.

**Task options:**

- openBrowser: Whether or not to automatically open a browser tab with the client when running this task.
- Please use buidler.config.js for additional options.

### Environment extensions

This plugin does not extend the environment.

### Usage

To use this plugin, please use [**create-aragon-app**](https://www.npmjs.com/package/create-aragon-app) with the buidler boilerplate option. For instructions on how to use this boilerplate, please refer to [**aragon-buidler-boilerplate**](https://github.com/aragon/aragon-buidler-boilerplate).

If you don't want to use a create-aragon-app or a boilerplate, you can follow the structure of the boilerplate linked above. In essence, the regular structure of a Buidler project should do. Please refer to the [**Buidler docs**](https://buidler.dev/).

### Configuration

This plugin extends BuidlerConfig by adding the following fields:

```js
export interface AragonConfig {
  appServePort?: number
  clientServePort?: number
  appSrcPath?: string
  appBuildOutputPath?: string
  hooks?: AragonConfigHooks
}
```

### Hooks

If you need to perform some tasks before deploying your application's proxy, e.g. deploying a token and passing that token in your proxy's initialize function, you can use the hooks object within the BuidlerConfig object. This object simply contains functions, which, if named correctly, will be called at the appropriate moments in the development pipeline:

```js
export interface AragonConfigHooks {
  preDao?: (bre: BuidlerRuntimeEnvironment) => Promise<void> | void
  postDao?: (
    dao: KernelInstance,
    bre: BuidlerRuntimeEnvironment
  ) => Promise<void> | void
  preInit?: (bre: BuidlerRuntimeEnvironment) => Promise<void> | void
  postInit?: (
    proxy: Truffle.ContractInstance,
    bre: BuidlerRuntimeEnvironment
  ) => Promise<void> | void
  getInitParams?: (bre: BuidlerRuntimeEnvironment) => Promise<any[]> | any[]
  postUpdate?: (
    proxy: Truffle.ContractInstance,
    bre: BuidlerRuntimeEnvironment
  ) => Promise<void> | void
}
```

For an example on how to use these hooks, please see the [**token-wrapper tests**](https://github.com/aragon/buidler-aragon/blob/master/test/projects/token-wrapper/scripts/hooks.js) within the plugin's test projects.

### Development

Please refer to the [**Buidler docs**](https://buidler.dev/advanced/building-plugins.html) for plugin development.

After cloning this repository, make sure you run `npm run dev` so that all required contract artifacts are available.

### Typescript support

You need to add this to your tsconfig.json's files array: "node_modules/@aragon/buidler-aragon/src/type-extensions.d.ts"
