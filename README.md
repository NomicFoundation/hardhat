# Sool: Solidity toolchain


## Warning

**Everything here is _highly_ experimental and can be changed, removed or never be completed.**


## Goals

This project aims to be a better toolchain for Solidity smart contracts development by:

* Having a simple code to attract more collaborators.
* Being reliable and giving clear error messages when we can't.
* Being fast, caching whatever is possible.
* Avoiding coupling with other js frameworks (ie: mocha). A sool-script must be runnable without invoking sool.
* Being extensible without the need to fork it.

As an extra, I also want to offer the possibility to write tests in typescript.


## TODO

* Make a mocha runner using the contract models and the generic script runner.
    - Make Truffle tests runnable with Sool?

* Dependencies resolution
    - Replace the parser with Fede Bond's one? It's GPL3 though :(
    - Use solc to detect imports so this is process error-compatible with the compilation. If done, cache the imports as loading solc is slow?
    - Support more libraries sources? EthPM?
    
* Compilation
    - Add cache
    
* Flatten
    - Understand solidity_flattener and mimic it if possible
    - Make a debugging flattener a la truffle-flattener

* TS contract models
    - Make a transaction "tracking" model to replace promievents
    - Define how models should look like
    - Make a generator for them
    - Add support for libraries
    - Add support for events

## Installation

There's no exportable artifacts yet, so just `yarn install` and use it locally.

## Running the project

Compiling everything: `node src/index.js compile` 

Running a user script using `sool`: `node src/index.js run src/sample-user-script-run-with-sool.js`

Running a user script without using `sool`: `node src/sample-user-script-run-without-sool.js`

Running tests: They can be any kind of user script, there's a sample mocha test in `test/` that can be run with `npx mocha` after compiling the project.


## Code style

Just run `yarn prettier` :)


## Sool projects structure

The root of the project must contain a `sool-config.js` file, and the contracts must be located in `<root>/contracts`.

