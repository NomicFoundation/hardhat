# S(olidity t)ool


## Warning

**Everything here is _highly_ experimental and can be changed or removed. _Any_ feedback or contribution is welcome :)**

## Goals

This project aims to be a better toolchain for Solidity smart contracts development by:

* Having a simple code to attract more collaborators.
* Being reliable and giving clear error messages when we can't.
* Being fast, caching whatever is possible.
* Avoiding coupling with other js frameworks (ie: mocha). A sool-script must be runnable without invoking sool.
* Being extensible without the need to fork it.

As an extra, I also want to offer the possibility to write tests in typescript.

## Architecture documentation

### Sool environment

The key concept in sool's architecture is the environment, which consist in a set of predefined functions, a Web3 instance, the project config and a way to run builtin and user-defined tasks.

The environment is initialized when `src/env.js` is loaded, so requiring this file is enough to use run in any javascript file. The sool binary is just a script that imports the environment and runs a task.

For convenience, all the environment's elements are injected to the the `global` before running a task.

### Tasks

Sool has a small DSL for defining and running tasks. A task is just an async function taking an array of command line arguments (see section Arguments) and can return whatever it wants.

Users of sool can define their own tasks, or redefine existing one as they please. Built-in tasks are divided in many small steps to users can override whichever they want.

Running a task returns whichever the task's function returns. When the task is run as the main task its return value is ignored.  
 

### Config

The configuration is defined in `sool-config.js` at the root of the project, and is loaded on-demand when the environment is required. When this file is imported Web3 and the tasks' DSL are available in `global`, and the built-in tasks already defined.

The user-provided config overrides a default configuration that can be found in `src/default-config.js`. The absolute path to the root of the project is also set as `config.paths.root`.

User defined tasks should be declared in the configuration file. If any of their names clashes with a built-in task's name, the user-defined one will be used. 

### Arguments

Both sools and tasks can receive arguments. They follow these rules:

* Any command line argument like `-a` or `--a` is interpreted as a paramter to sool with name `a` and its value will be the next argument, or `true` if none is available.

* The fist of the rest of the arguments is used as the name of the main task to run.

* All other parameters are passed as strings to the main task.

While this is enough when using the `sool` tool, it may not work if a script that includes the sool environment is run with another project. For those cases you can also pass arguments to sool as env variables with the same `SOOL_ARGUMENTNAMEINCAPS`. If there is an argument set in the command line and with an env variable, the command line version takes precedence.

## Installation

There's no exportable artifacts yet, so just `yarn install` and use it locally.

## Running the project

Compiling everything: `node src/index.js compile` 

Running a user script using `sool`: `node src/index.js run src/sample-user-script-run-with-sool.js`

Running a user script without using `sool`: `node src/sample-user-script-run-without-sool.js`

Running tests: They can be any kind of user script, there's a sample mocha test in `test/` that can be run with `npx mocha` after compiling the project.


## Code style

Just run `yarn prettier` :)

It's OK and to commit prettier generated changes in a separate commit, so don't worry if you only remember to run it 
from time to time.


## Sool projects structure

The root of the project must contain a `sool-config.js` file, and the contracts must be located in `<root>/contracts`.


## TODO

* Dependencies resolution
    - Don't use solidity-parser. Two options:
        1. Replace the parser with solidity-parser-antlr once its relicenced.
        2. Use solc to detect imports so this is process error-compatible with the compilation. If done, cache the imports as loading solc is slow?
    - Support more libraries sources? EthPM?
    
* Compilation
    - Make sure that the list of compilers is downloaded using a secure connection (cert validated)
    - Validate downloaded compiler
    - Add cache
    - Add optimizer config
    - Use the config !
    
* Flatten
    - Understand solidity_flattener and mimic it if possible
    - Make a debugging flattener a la truffle-flattener
   
* Deployment
    - Add support for libraries 
   
* Optimizations
    - Compile solc to wasm instead of asm.js
    
* Parallel test runner
    - Check what espresso does. Does each runner need its own blockchain?
    
* Truffle compatibility
    - Make Truffle tests runnable with Sool? They use Web3 0.x, maybe it's impossible.
    - Make sure the sool's config compatible with theirs wherever it makes sense.
    - How does their config's network_id work?

* TS contract models
    - Make a transaction "tracking" model to replace promievents
    - Define how contract models should look like
    - Make a generator for them
