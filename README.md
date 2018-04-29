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

The environment is created before running any task when using sool. When running a standalone sool-script the user needs to require `src/core/importable-environment.js`, which will initialize the environment if it hasn't been created before (ie: it isn't being run with sool).  

For convenience, all the environment's elements are injected to the the `global` before running a task, and the environment itself is set to `global.env`.

`src/core/importable-environment.js` is set as the package main so once uploaded to npm it can be imported with `require("sool")` in any user script.

### Tasks

Sool has a small DSL for defining and running tasks. See `src/tasks/*.js` tasks for examples.

Users of sool can define their own tasks, or redefine existing one as they please. Built-in tasks are divided in many small steps so users can partially override them.

Running a task returns whichever the task's action function returns. When the task is run as the main task by sool its return value is ignored.  
 

### Config

The configuration is defined in `sool-config.js` at the root of the project, and is loaded on-demand right before creating the environment. When this file is imported Web3 and the tasks' DSL are available in `global`, and the built-in tasks already defined.

The user-provided config overrides a default configuration that can be found in `src/core/default-config.js`. Some of information about the project structure is available in `config.paths`.

User defined tasks should be declared in the configuration file. If any of their names clashes with a built-in task's name, the user-defined one will be used, and a `runSuper()` function will be available during that task. 

### Arguments

Sool tasks can define their arguments using the tasks DSL. These are automatically validated and parsed by sool. Also, help messages are taken care of.

Sool also receives arguments, which must be passed before the task name.

When running a a sool-script without sool command line arguments are not parsed, but sool's arguments can be passed as env variables. For example, if sool defines a "network" argument, it will be read from "SOOL_NETWORK" env variable.

## Installation

There's no exportable artifacts yet, so just `yarn install` and use it locally.

## Running the project

Read sools help by running: `./src/core/bin.js`

Compiling everything: `./src/core/bin.js compile` 

Running a user script using `sool`: `./src/core/bin.js run src/samples/user-script.js`

Running a user script without using `sool`: `node src/samples/standalone-user-script.js`

Running tests using `sool`: Tests in `test/` can be run with sool with `./src/core/bin.js test`. They are mocha tests with the environment, `chai.assert` and web3's `accounts` exported in global.

Running tests without using `sool`: They can be any user script, run with any test runner. There's a sample mocha test that can be run with `npx mocha src/samples/standalone-mocha-test.js` 

## Code style

Just run `yarn prettier` :)

It's OK and to commit prettier generated changes in a separate commit, so don't worry if you only remember to run it 
from time to time.


## Sool projects structure

The root of the project must contain a `sool-config.js` file, and the contracts must be located in `<root>/contracts`.

## TODO

A list of tasks to complete, mostly in priority order:

* Migration to web3 0.x

* Truffle compatibility
    - Export truffle artifacts
    - Make a truffle-contracts loader (API compatible with truffle's)
    - Make Truffle tests runnable with Sool
    - Make sure the sool's config compatible with theirs wherever it makes sense.
        - How does their config's network_id work?

* TS contract models
    - Select a typescript contract generator and integrate it
    - Make a task to run typescript tests
    
* Flatten
    - Understand solidity_flattener and mimic it if possible
    - Make a debugging flattener a la truffle-flattener

* Errores
    - Define error codes for *every* possible exception
    
* Artifacts
    - Choose a sensible artifacts fs hierarchy and make the artifacts module work with it.
    
* Parallel test runner
    - Check what espresso does. Does each runner need its own blockchain?

* Dependencies resolution
    - Don't use solidity-parser. Two options:
        1. Replace the parser with solidity-parser-antlr once its relicenced.
        2. Use solc to detect imports so this is process error-compatible with the compilation. If done, cache the imports as loading solc is slow?
    - Support more libraries sources? EthPM?
    
* Optimizations
    - Compile solc to wasm instead of asm.js
    