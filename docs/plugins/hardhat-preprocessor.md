---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/wighawag/hardhat-preprocessor/tree/master)
:::

👷[hardhat](https://hardhat.org)

# hardhat-preprocessor

_This plugin allows to pre-preocess contract source code before compilation_

[Hardhat](http://hardhat.org) preprocessor plugin.

## What

This plugin allow you to specify a function that is executed on every line of all contracts so that you can pre-process the code.

A typical example (included) is to remove console.log for production ready contracts.

Note that this plugin, by default, does not touch the filesystem. It happens in memory and transform contract on-demand.

This is done by simply importing the plugin in the hardhat.config.js

It also include a task that can be invoked to render the transformation on disk instead.


## Installation

```bash
npm install hardhat-preprocessor
```

And add the following statement to your `hardhat.config.js`:

```ts
import 'hardhat-preprocessor';
```

## Required plugins

Nothing required

## Tasks

`hardhar-preprocessor` also add a new task: `preprocess`

`hardhat preprocess [--dest <destination folder>]`

This task will write the modification to disk. By default it overwrite the sources. if the `dest` option is set, it will write in that folder instead (and keep sources intact).

## Environment extensions

No extra fields added to the envirobment.

## Configuration

This plugin extends the Hardhat Config with one new field: `preprocess`

This field is an object with a field : `eachLine` that itself is a function that accept the HRE as argument and must return either an object with a `transform` field  or a promise to such object.

The `transform` function expect a string as argument (a line of a contract) and must return a string.

The object containing the `transform` function can also have a `settings` field that is used for caching. If no settings field is set, no caching will take place and contracts will be recompiled. If the settings field is set, then the contract will be recompiled only if the settings changed.

Note that instead of returning (or resolving a function), it is possible to return undefined to skip the preprocessing entirely. This will recompile contract if the previous invocation had returned something.

Basic example that add a comment on each line:

```ts
import 'hardhat-preprocessor';
export default {
  preprocess: {
    eachLine: (hre) => ({
      transform: (line) => line + '// comment at the end of each line',
      settings: {comment: true} // ensure the cache is working, in that example it can be anything as there is no option, the preprocessing happen all the time
    })
  },
};
```

The plugin comes also with a preprocess function to remove `console.log` (achieving the same thing as this [plugin](https://github.com/ItsNickBarry/buidler-log-remover) but without changing the files on disk)

You can use it as follow :

```ts
import {removeConsoleLog} from 'hardhat-preprocessor';
export default {
  preprocess: {
    eachLine: removeConsoleLog((hre) => hre.network.name !== 'hardhat' && hre.network.name !== 'localhost'),
  },
};
```

In this example the preprocessing do not happen when used against hardhat (testing) or localhost


## Usage

There are no additional steps you need to take for this plugin to work.
