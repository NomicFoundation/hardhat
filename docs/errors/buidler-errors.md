# Buidler errors

This section contains a list of all the possible errors you may encounter when using Buidler and an explanation of each of them.

## General errors

### BDLR1: You are not inside a Buidler project

You are trying to run Buidler outside of a Buidler project.

You can learn hoy to use Buidler by reading the [Getting Started guide](../README.md).

### BDLR2: Unsupported Node.js

Buidler doesn't support your Node.js version.

Please upgrade your version of Node.js and try again.

### BDLR3: Unsupported operation

You are tying to perform an unsupported operation.

Unless you are creating a task or plugin, this is probably a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR4: Buidler was already initialized

Buidler initialization was executed twice. This is a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR5: Buidler wasn't initialized

Buidler initialization failed. This is a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR6: Buidler Runtime Environment not created

Buidler initialization failed. This is a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR7: Tried to create the Buidler Runtime Environment twice

The Buidler initialization process was executed twice. This is a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR8: Invalid Buidler config

You have one or more errors in your config file.

Check the error message for details, or go to the [documentation](https://buidler.dev/config/) to learn more.

### BDLR9: Failed to load config file

There was an error while loading your config file.

The most common source of errors is trying to import `@nomiclabs/buidler` instead of `@nomiclabs/buidler/config`.

Please make sure your config file is correct.

### BDLR10: Attempted to modify the user's config

An attempt to modify the user's config was made.

This is probably a bug in one of your plugins.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR11: BuidlerContext's config path not defined

The Buidler initialization process was incomplete. This is a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

## Network related errors

### BDLR100: Selected network doesn't exist

You are trying to run Buidler with a non-existent network.

Read the [documentation](https://buidler.dev/config/#networks-configuration) to learn how to define custom networks.

### BDLR101: Connected to the wrong network

Your config specifies a chain id for the network you are trying to used, but Buidler detected anotherone.

Please make sure you are setting your config correctly.

### BDLR102: Incorrectly send chainId in a transaction

Buidler sent the `chainId` field in a transaction.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR103: Missing `data` param when calling eth_sign.

You called `eth_sign` with incorrect parameters.

Please check that you are sending a `data` parameter.

### BDLR104: Unrecognized account

You are trying to send a transaction or sign some data with an account not managed by your Ethereum node nor Buidler.

Please double check your accounts and the `from` parameter in your RPC calls.

### BDLR105: Missing transaction parameter

You are trying to send a transaction with a locally managed account, and some parameters are missing.

Please double check your transactions' parameters.

### BDLR106: No remote accounts available

No local account was set and there are accounts in the remote node.

Please make sure that your Ethereum node has unlocked accounts.

### BDLR107: Invalid HD path

An invalid HD/BIP32 derivation path was provided in your config.

Read the [documentation](https://buidler.dev/config/#hd-wallet-config) to learn how to define HD accounts correctly.

### BDLR108: Invalid JSON-RPC value

One of your transactions sent or received an invalid JSON-RPC QUANTITY value.

Please double check your calls' parameters and keep your Ethereum node up to date.

### BDLR109: Cannot connect to the network

Cannot connect to the network.

Please make sure your node is running, and check your internet connection and networks config.

### BDLR110: Network timeout

One of your JSON-RPC requests timed-out.

Please make sure your node is running, and check your internet connection and networks config.

### BDLR111: Invalid JSON-RPC response

One of your JSON-RPC requests received an invalid response.

Please make sure your node is running, and check your internet connection and networks config.

### BDLR112: Could not derive an HD key

One of your HD keys could not be derived.

Try using another mnemonic or deriving less keys.

## Task definition errors

### BDLR200: Could not add positional param

Could add a positional param to your task because there is already a variadic positional param and it has to be the last positional one.

Please double check your task definitions.

### BDLR201: Repeated param name

Could not add a param to your task because its name is already used.

Please double check your task definitions.

### BDLR202: Buidler and task param names clash

Could not add a param to your task because its name is used as a param for Buidler.

Please double check your task definitions.

### BDLR203: Optional param followed by a required one

Could not add param to your task because it is required and it was added after an optional positional param.

Please double check your task definitions.

### BDLR204: Attempted to add params to an overridden task

You can't change param definitions in an overridden task.

Please, double check your task definitions.

### BDLR210: Attempted to add mandatory params to an overridden task

You can't add mandatory (non optional) param definitions in an overridden task. The only supported param additions for overridden tasks are flags, and optional params.

Please, double check your task definitions.

### BDLR211: Attempted to add positional params to an overridden task

You can't add positional param definitions in an overridden task. The only supported param additions for overridden tasks are flags, and optional params.

Please, double check your task definitions.

### BDLR212: Attempted to add variadic params to an overridden task

You can't add variadic param definitions in an overridden task. The only supported param additions for overridden tasks are flags, and optional params.

Please, double check your task definitions.

### BDLR205: Tried to run task without an action

A task was run, but it has no action set.

Please double check your task definitions.

### BDLR206: `runSuper` not available

You tried to call `runSuper` from a non-overridden task.

Please use `runSuper.isDefined` to make sure that you can call it.

### BDLR207: Default value has incorrect type

One of your tasks has a parameter whose default value doesn't match the expected type.

Please double check your task definitions.

### BDLR208: Required parameter has a default value

One of your tasks has a required parameter with a default value.

Please double check your task definitions.

### BDLR209: Invalid casing in parameter name

Your parameter names must use camelCase.

Please double check your task definitions.

## Arguments related errors

### BDLR300: Invalid environment variable value

You are setting one of Buidler arguments using an environment variable, but it has an incorrect value.

Please double check your environment variables.

### BDLR301: Invalid argument type

One of your Buidler or task's arguments has an invalid type.

Please double check your arguments.

### BDLR302: Invalid file argument

One of your tasks expected a file as an argument, but you provided a non-existent or non-readable file.

Please double check your arguments.

### BDLR303: Unrecognized task

Tried to run a non-existent task.

Please double check the name of the task you are trying to run.

### BDLR304: Unrecognized command line argument

Buidler couldn't recognize one of your command line arguments.

This may be because you are writing it before the task name. It should come after it.

Please double check how you invoked Buidler.

### BDLR305: Unrecognized param

Buidler couldn't recognize one of your tasks' parameters.

Please double check how you invoked Buidler or run your task.

### BDLR306: Missing task argument

You tried to run a task, but one of its required arguments was missing.

Please double check how you invoked Buidler or run your task.

### BDLR307: Missing task positional argument

You tried to run a task, but one of its required arguments was missing.

Please double check how you invoked Buidler or run your task.

### BDLR308: Unrecognized task positional argument

You tried to run a task with more positional arguments than needed.

Please double check how you invoked Buidler or run your task.

### BDLR309: Repeated task parameter

You tried to run a task with a repeated parameter.

Please double check how you invoked Buidler or run your task.

### BDLR310: Invalid casing in command line parameter

You tried to run buidler with a parameter with invalid casing. They must be lowercase.

Please double check how you invoked Buidler.

### BDLR311: Invalid JSON parameter

You tried to run a task with an invalid JSON parameter.

Please double check how you invoked Buidler or run your task.

## Dependencies resolution errors

### BDLR400: Solidity file not found

Tried to resolve a non-existing Solidity file as an entry-point.

### BDLR401: Tried to import file outside your project

One of your projects tried to import a file that it's outside your Buidler project.

This is disabled for security reasons.

### BDLR402: Resolved library file as a local one

One of your libraries' files was treated as a local file. This is a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR403: Solidity library not installed

One of your Solidity sources imports a library that is not installed.

Please double check your imports or install the missing dependency.

### BDLR404: Missing library file

One of your libraries' files was imported but doesn't exist.

Please double check your imports or update your libraries.

### BDLR405: Illegal Solidity import

One of your libraries tried to use a relative import to import a file outside of its scope.

This is disabled for security reasons.

### BDLR406: Illegal Solidity import

One of your libraries tried to use a relative import to import a file outside of its scope.

This is disabled for security reasons.

### BDLR407: Imported file not found

One of your source files imported a non-existing one.

Please double check your imports.

## Solidity related errors

### BDLR500: Invalid `solc` version

The Solidity version in your config is invalid or hasn't been released yet.

Please double check your `solc` config.

### BDLR501: `solc` download failed

Couldn't download `solc`.

Please check your Internet connection.

### BDLR502: Couldn't obtain `solc` version list

Couldn't download `solc`'s version list.

Please check your Internet connection.

### BDLR503: Downloaded `solc` checksum verification failed

Downloaded `solc` verification failed..

Please check your Internet connection.

## Built-in tasks errors

### BDLR600: Compilation failed

Your smart contracts failed to compile.

Please check Buidler's output for more details.

### BDLR601: Script doesn't exist

Tried to use `buidler run` to execut a non-existing script.

Please double check your script's path

### BDLR602: Error running script

Running a script resulted in an error.

Please check Buidler's output for more details.

### BDLR603: Flatten detected cyclic dependencies

Buidler flatten doesn't support cyclic dependencies.

We recommend not using this kind of dependencies.

### BDLR604: Error running JSON-RPC server

There was error while starting the JSON-RPC HTTP server.

### BDLR605: Error handling JSON-RPC request

Handling an incoming JSON-RPC request resulted in an error.

### BDLR606: Unsupported network for JSON-RPC server.

JSON-RPC server can only be started when running the BuidlerEVM network.

To start the JSON-RPC server, retry the command without the --network parameter.

## Artifacts related errors

### BDLR700: Artifact not found

Tried to import a non-existing artifact.

Please double check that your contracts have been compiled and your artifact's name.

## Plugin system errors

### BDLR800: Plugin not installed

You are trying to use a plugin that hasn't been installed.

Please follow Buidler's instructions to resolve this.

### BDLR801: Plugin dependencies not installed

You are trying to use a plugin with unmet dependencies.

Please follow Buidler's instructions to resolve this.

### BDLR802: Plugin dependencies's version mismatch

You are trying to use a plugin that requires a different version of one of its dependencies.

Please follow Buidler's instructions to resolve this.

### BDLR803: Importing a plugin with `require`

You are trying to load a plugin with a call to `require`.

Please use `usePlugin(npm-plugin-package)` instead.

## Internal Buidler errors

### BDLR900: Invalid error message template

An error message template contains an invalid variable name. This is a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR901: Invalid error message replacement

Tried to replace an error message variable with a value that contains another variable name. This is a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.

### BDLR902: Missing replacement value from error message template

An error message template is missing a replacement value. This is a bug.

Please [report it](https://github.com/nomiclabs/buidler/issues/new) to help us improve Buidler.
