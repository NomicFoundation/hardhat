---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/N1ghtly/hardhat-watcher/tree/main)
:::

# hardhat-watcher

_Automatically run Hardhat actions when files change_

## Installation

```bash
npm install hardhat-watcher
```

or 

```bash
yarn add hardhat-watcher
```

Import the plugin in your `hardhat.config.js`:

```js
require("hardhat-watcher");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "hardhat-watcher";
```

## Tasks

This plugin adds the _watch_ task to Hardhat:
```bash
npx hardhat watch
```

## Configuration

This plugin extends the `HardhatUserConfig`'s object with an optional
`watcher` field. Every property of `watcher` is optional.

This is the complete type:

```js
module.exports = {
  watcher: {
    [key: string]: { // key is the name for the watcherTask
      tasks?: (string | { command: string, params?: { [key: string] => any } })[]; // Every task of the hardhat runtime is supported (including other plugins!)
      files?: string[]; // Files, directories or glob patterns to watch for changes. (defaults to `[config.paths.sources]`, which itself defaults to the `contracts` dir)
      verbose?: boolean; // Turn on for extra logging
    }
  }
};
```

## Usage

The most basic use case, which is simply compiling your files on change, is accomplished very easily with this config:

```js
module.exports = {
  watcher: {
    compilation: {
      tasks: ["compile"],
    }
  },
}
```

and subsequently running `npx hardhat watch compilation`

A bit more involved and showcasing the use of parameters for tasks and defining multiple watcher tasks:

```js
module.exports = {
  watcher: {
    compilation: {
      tasks: ["compile"],
      files: ["./contracts"],
      verbose: true,
    },
    ci: {
      tasks: ["clean", { command: "compile", params: { quiet: true } }, { command: "test", params: { noCompile: true, testFiles: ["testfile.ts"] } } ],
    }
  },
}
```

Run `npx hardhat watch ci` to clean, compile and test on every file change, or run `npx hardhat watch compilation` to compile.

### Positional arguments

Positional arguments are provided in the same way as "normal" arguments (check out the `testFiles` argument in the example above, it's a positional argument).
In order to find the name of a positional argument, simply run `yarn hardhat <YOUR_COMMAND> --help`.
This is an example output for the `test` command:

````
Hardhat version 2.0.2

Usage: hardhat [GLOBAL OPTIONS] test [--no-compile] [...testFiles]

OPTIONS:

  --no-compile  Don't compile before running this task 

POSITIONAL ARGUMENTS:

  testFiles     An optional list of files to test (default: [])

test: Runs mocha tests

For global options help run: hardhat help
````
### Changed file as argument

The path of the changed file can be inserted into positional arguments using the template parameter `{path}`. This speeds up iteration in testing, especially if using single test isolation (for example, by using `it.only("test")` in mocha.)

Example:
````
module.exports = {
  watcher: {
    test: {
      tasks: [{ command: 'test', params: { testFiles: ['{path}'] } }],
      files: ['./test/**/*'],
      verbose: true
    }
  }
}
````

