# Hardhat errors
This section contains a list of all the possible errors you may encounter when
using Hardhat and an explanation of each of them.
## General errors
### [HH1: You are not inside a Hardhat project](#HH1)
You are trying to run Hardhat outside of a Hardhat project.

You can learn how to use Hardhat by reading the [Getting Started guide](../getting-started).
### [HH2: Unsupported Node.js](#HH2)
Hardhat doesn't support your Node.js version. 

Please upgrade your version of Node.js and try again.
### [HH3: Unsupported operation](#HH3)
You are trying to perform an unsupported operation. 

Unless you are creating a task or plugin, this is probably a bug. 

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH4: Hardhat was already initialized](#HH4)
Hardhat initialization was executed twice. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH5: Hardhat wasn't initialized](#HH5)
Hardhat initialization failed. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH6: Hardhat Runtime Environment not created](#HH6)
Hardhat initialization failed. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH7: Tried to create the Hardhat Runtime Environment twice](#HH7)
The Hardhat initialization process was executed twice. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH8: Invalid Hardhat config](#HH8)
You have one or more errors in your config file. 
      
Check the error message for details, or go to the [documentation](https://hardhat.org/config/) to learn more.
### [HH9: Failed to load config file](#HH9)
There was an error while loading your config file. 

The most common source of errors is trying to import the Hardhat Runtime Environment from your config or a file imported from it.
This is not possible, as Hardhat can't be initialized while its config is being defined.

You may also have accidentally imported `hardhat` instead of `hardhat/config`.

Please make sure your config file is correct.

To learn more about how to access the Hardhat Runtime Environment from different contexts go to https://hardhat.org/hre
### [HH10: Attempted to modify the user's config](#HH10)
An attempt to modify the user's config was made.

This is probably a bug in one of your plugins.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH11: Invariant violation](#HH11)
An internal invariant was violated.
This is probably caused by a programming error in hardhat or in one of the used plugins.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH12: Hardhat is not installed or installed globally](#HH12)
You tried to run Hardhat from a global installation or not installing it at all. This is not supported.

Please install Hardhat locally using npm or Yarn, and try again.
### [HH13: ts-node not installed](#HH13)
You are running a Hardhat project that uses typescript, but you haven't installed ts-node.

Please run this and try again: `npm install --save-dev ts-node`
### [HH14: typescript not installed](#HH14)
You are running a Hardhat project that uses typescript, but it's not installed.

Please run this and try again: `npm install --save-dev typescript`
### [HH15: You are not inside a Hardhat project and Hardhat failed to initialize a new one](#HH15)
You are trying to run Hardhat outside of a Hardhat project, and we couldn't initialize one.

If you were trying to create a new project, please try again using Windows Subsystem for Linux (WSL) or PowerShell.

You can learn how to use Hardhat by reading the [Getting Started guide](../getting-started).
### [HH16: conflicting files during project creation](#HH16)
You are trying to create a new hardhat project, but there are existing files that would be overwritten by the creation process.

Either try using a new directory name, or remove the conflicting files.
### [HH17: Invalid big number](#HH17)
Hardhat attempted to convert the input value to a BigInt, but no known conversion method was applicable to the given value.

## Network related errors
### [HH100: Selected network doesn't exist](#HH100)
You are trying to run Hardhat with a nonexistent network.

Read the [documentation](https://hardhat.org/config/#networks-configuration) to learn how to define custom networks.
### [HH101: Connected to the wrong network](#HH101)
Your config specifies a chain id for the network you are trying to use, but Hardhat detected a different chain id.

Please make sure you are setting your config correctly.
### [HH102: Missing `data` param when calling eth_sign.](#HH102)
You called `eth_sign` with incorrect parameters.

Please check that you are sending a `data` parameter.
### [HH103: Unrecognized account](#HH103)
You are trying to send a transaction or sign some data with an 
account not managed by your Ethereum node nor Hardhat.  

Please double check your accounts and the `from` parameter in your RPC calls.
### [HH104: Missing transaction parameter](#HH104)
You are trying to send a transaction with a locally managed 
account, and some parameters are missing. 

Please double check your transactions' parameters.
### [HH105: No remote accounts available](#HH105)
No local account was set and there are accounts in the remote node. 

Please make sure that your Ethereum node has unlocked accounts.
### [HH106: Invalid HD path](#HH106)
An invalid HD/BIP32 derivation path was provided in your config.  
      
Read the [documentation](https://hardhat.org/config/#hd-wallet-config) to learn how to define HD accounts correctly.
### [HH107: Invalid JSON-RPC value](#HH107)
One of your transactions sent or received an invalid JSON-RPC QUANTITY value. 

Please double check your calls' parameters and keep your Ethereum node up to date.
### [HH108: Cannot connect to the network](#HH108)
Cannot connect to the network.

Please make sure your node is running, and check your internet connection and networks config.
### [HH109: Network timeout](#HH109)
One of your JSON-RPC requests timed out.

Please make sure your node is running, and check your internet connection and networks config.
### [HH110: Invalid JSON-RPC response](#HH110)
One of your JSON-RPC requests received an invalid response. 

Please make sure your node is running, and check your internet connection and networks config.
### [HH111: Could not derive an HD key](#HH111)
One of your HD keys could not be derived. 

Try using another mnemonic or deriving less keys.
### [HH112: Invalid JSON-RPC value](#HH112)
One of your calls sent or received an invalid JSON-RPC DATA value. 

Please double check your calls' parameters and keep your Ethereum node up to date.
### [HH113: Invalid `data` param when calling eth_signTypedData_v4.](#HH113)
You called `eth_signTypedData_v4` with incorrect parameters.
Please check that you are sending a `data` parameter with a JSON string or object conforming to EIP712 TypedData schema.
### [HH114: Incompatible fee price parameters](#HH114)
You are trying to send a transaction with a locally managed 
account, and its parameters are incompatible. You sent both gasPrice, and maxFeePerGas or maxPriorityFeePerGas.  

Please double check your transactions' parameters.
### [HH115: Missing fee price parameters](#HH115)
You are trying to send a transaction with a locally managed account, and no fee price parameters were provided. You need to send gasPrice, or maxFeePerGas and maxPriorityFeePerGas.  

Please double check your transactions' parameters.
### [HH116: Missing `address` param when calling personal_sign.](#HH116)
You called `personal_sign` with incorrect parameters.

Please check that you are sending an `address` parameter.

## Task definition errors
### [HH200: Could not add positional param](#HH200)
Could add a positional param to your task because 
there is already a variadic positional param and it has to be the last 
positional one.

Please double check your task definitions.
### [HH201: Repeated param name](#HH201)
Could not add a param to your task because its name is already used.
      
Please double check your task definitions.
### [HH202: Hardhat and task param names clash](#HH202)
Could not add a param to your task because its name is used as a param for Hardhat.
      
Please double check your task definitions.
### [HH203: Optional param followed by a required one](#HH203)
Could not add param to your task because it is required and it was added after an optional positional param.
      
Please double check your task definitions.
### [HH204: Tried to run task without an action](#HH204)
A task was run, but it has no action set.  

Please double check your task definitions.
### [HH205: `runSuper` not available](#HH205)
You tried to call `runSuper` from a non-overridden task. 

Please use `runSuper.isDefined` to make sure that you can call it.
### [HH206: Default value has incorrect type](#HH206)
One of your tasks has a parameter whose default value doesn't match the expected type. 

Please double check your task definitions.
### [HH207: Required parameter has a default value](#HH207)
One of your tasks has a required parameter with a default value. 

Please double check your task definitions.
### [HH208: Invalid casing in parameter name](#HH208)
Your parameter names must use camelCase.  

Please double check your task definitions.
### [HH209: Attempted to add mandatory params to an overridden task](#HH209)
You can't add mandatory (non optional) param definitions in an overridden task.
The only supported param additions for overridden tasks are flags
and optional params.

Please double check your task definitions.
### [HH210: Attempted to add positional params to an overridden task](#HH210)
You can't add positional param definitions in an overridden task.
The only supported param additions for overridden tasks are flags
and optional params.

Please double check your task definitions.
### [HH211: Attempted to add variadic params to an overridden task](#HH211)
You can't add variadic param definitions in an overridden task.
The only supported param additions for overridden tasks are flags
and optional params.

Please double check your task definitions.
### [HH212: Invalid argument type](#HH212)
Tasks that can be invoked from the command line require CLIArgumentType types for their arguments.
      
What makes these types special is that they can be represented as strings, so you can write them down in the terminal.

## Arguments related errors
### [HH300: Invalid environment variable value](#HH300)
You are setting one of Hardhat's arguments using an environment variable, but it has an incorrect value.

Please double check your environment variables.
### [HH301: Invalid argument type](#HH301)
One of your Hardhat or task arguments has an invalid type.

Please double check your arguments.
### [HH302: Invalid file argument](#HH302)
One of your tasks expected a file as an argument, but you provided a 
nonexistent or non-readable file.

Please double check your arguments.
### [HH303: Unrecognized task](#HH303)
Tried to run a nonexistent task.

Please double check the name of the task you are trying to run.
### [HH304: Unrecognized command line argument](#HH304)
Hardhat couldn't recognize one of your command line arguments.
       
This may be because you are writing it before the task name. It should come after it.

Please double check how you invoked Hardhat.
### [HH305: Unrecognized param](#HH305)
Hardhat couldn't recognize one of your tasks' parameters.
       
Please double check how you invoked Hardhat or ran your task.
### [HH306: Missing task argument](#HH306)
You tried to run a task, but one of its required arguments was missing. 

Please double check how you invoked Hardhat or ran your task.
### [HH307: Missing task positional argument](#HH307)
You tried to run a task, but one of its required arguments was missing. 

Please double check how you invoked Hardhat or ran your task.
### [HH308: Unrecognized task positional argument](#HH308)
You tried to run a task with more positional arguments than expected.

Please double check how you invoked Hardhat or ran your task.
### [HH309: Repeated task parameter](#HH309)
You tried to run a task with a repeated parameter. 

Please double check how you invoked Hardhat or ran your task.
### [HH310: Invalid casing in command line parameter](#HH310)
You tried to run hardhat with a parameter with invalid casing. They must be lowercase. 

Please double check how you invoked Hardhat.
### [HH311: Invalid JSON parameter](#HH311)
You tried to run a task with an invalid JSON parameter. 

Please double check how you invoked Hardhat or ran your task.
### [HH312: Subtask run from the command line](#HH312)
You tried to run a subtask from the command line.
      
This is not supported. Please run the help task to see the available options.

## Dependencies resolution errors
### [HH400: Solidity file not found](#HH400)
Tried to resolve a nonexistent Solidity file as an entry-point.
### [HH401: Solidity library not installed](#HH401)
One of your Solidity sources imports a library that is not installed.

Please double check your imports or install the missing dependency.
### [HH402: Missing library file](#HH402)
One of your libraries' files was imported but doesn't exist. 

Please double check your imports or update your libraries.
### [HH403: Illegal Solidity import](#HH403)
One of your libraries tried to use a relative import to import a file outside of its scope. 

This is disabled for security reasons.
### [HH404: Imported file not found](#HH404)
One of your source files imported a nonexistent file.

Please double check your imports.
### [HH405: Invalid import: use / instead of \](#HH405)
A Solidity file is trying to import another file via relative path and is using backslashes (\\) instead of slashes (/).
      
You must always use slashes (/) in Solidity imports.
### [HH406: Invalid import: trying to use an unsupported protocol](#HH406)
A Solidity file is trying to import a file using an unsupported protocol, like http.
      
You can only import files that are available locally or installed through npm.
### [HH407: Invalid import: absolute paths unsupported](#HH407)
A Solidity file is trying to import a file using its absolute path.
      
This is not supported, as it would lead to hard-to-reproduce compilations.
### [HH408: Invalid import: file outside of the project](#HH408)
A Solidity file is trying to import a file that is outside of the project.
      
This is not supported by Hardhat.
### [HH409: Invalid import: wrong file casing](#HH409)
A Solidity file is trying to import a file but its source name casing was wrong.
      
Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.
### [HH410: Incorrect source name casing](#HH410)
You tried to resolve a Solidity file with an incorrect casing.
      
Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.
### [HH411: Invalid import: library not installed](#HH411)
A Solidity file is trying to import another which belongs to a library that is not installed.
      
Try installing the library using npm.

## Solidity related errors
### [HH500: Invalid `solc` version](#HH500)
The Solidity version in your config is invalid or hasn't been released yet. 

Please double check your `solc` config.
### [HH501: `solc` download failed](#HH501)
Couldn't download `solc`. 
      
Please check your Internet connection.
### [HH502: Couldn't obtain `solc` version list](#HH502)
Couldn't download `solc`'s version list. 
      
Please check your Internet connection.
### [HH503: Downloaded `solc` checksum verification failed](#HH503)
Downloaded `solc` verification failed.
      
Please check your Internet connection.
### [HH504: The solc compiler couldn't be obtained](#HH504)
Hardhat couldn't obtain a valid solc compiler.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.

## Built-in tasks errors
### [HH600: Compilation failed](#HH600)
Your smart contracts failed to compile.
      
Please check Hardhat's output for more details.
### [HH601: Script doesn't exist](#HH601)
Tried to use `hardhat run` to execute a nonexistent script.
      
Please double check your script's path.
### [HH602: Error running script](#HH602)
Running a script resulted in an error. 

Please check Hardhat's output for more details.
### [HH603: Flatten detected cyclic dependencies](#HH603)
Hardhat flatten doesn't support cyclic dependencies. 

We recommend not using this kind of dependency.
### [HH604: Error running JSON-RPC server](#HH604)
There was error while starting the JSON-RPC HTTP server.
### [HH605: Unsupported network for JSON-RPC server.](#HH605)
JSON-RPC server can only be started when running the Hardhat Network.
      
To start the JSON-RPC server, retry the command without the --network parameter.
### [HH606: The project cannot be compiled](#HH606)
The project cannot be compiled with the current settings.
### [HH607: Missing fork URL](#HH607)
You passed a block number to fork from, but not a URL. Hardhat cannot fork
if the URL of the JSON-RPC wasn't set.
### [HH608: Unsupported solc version](#HH608)
This version of solidity is not supported by Hardhtat.
Please use a newer, supported version.

## Artifacts related errors
### [HH700: Artifact not found](#HH700)
Tried to import a nonexistent artifact.

Please double check that your contracts have been compiled and double check your artifact's name.
### [HH701: Multiple artifacts found](#HH701)
There are multiple artifacts that match the given contract name, and Hardhat doesn't know which one to use. 

Please use the fully qualified name of the contract to disambiguate it.
### [HH702: Incorrect artifact path casing](#HH702)
You tried to get an artifact file with an incorrect casing.
      
Hardhat's artifact resolution is case sensitive to ensure projects are portable across different operating systems.

## Plugin system errors
### [HH800: Using a buidler plugin](#HH800)
You are trying to use a Buidler plugin in Hardhat. This is not supported.

Please use the equivalent Hardhat plugin instead.
### [HH801: Plugin dependencies not installed](#HH801)
You are trying to use a plugin with unmet dependencies.

Please follow Hardhat's instructions to resolve this.

## Internal Hardhat errors
### [HH900: Invalid error message template](#HH900)
An error message template contains an invalid variable name. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH901: Invalid error message replacement](#HH901)
Tried to replace an error message variable with a value that contains another variable name. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH902: Missing replacement value from error message template](#HH902)
An error message template is missing a replacement value. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.
### [HH903: Inferred artifact path doesn't exist](#HH903)
The inferred artifact path doesn't exist.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.

## Source name errors
### [HH1000: Invalid source name: absolute path](#HH1000)
A Solidity source name was expected, but an absolute path was given.
      
If you aren't overriding compilation-related tasks, please report this as a bug.
### [HH1001: Invalid source name: relative path](#HH1001)
A Solidity source name was expected, but a relative path was given.
      
If you aren't overriding compilation-related tasks, please report this as a bug.
### [HH1002: Invalid source name: backslashes](#HH1002)
A Solidity source name was invalid because it uses backslashes (\\) instead of slashes (/).
      
If you aren't overriding compilation-related tasks, please report this as a bug.
### [HH1003: Invalid source name: not normalized](#HH1003)
A Solidity source name was invalid because it wasn't normalized. It probably contains some "." or "..".
      
If you aren't overriding compilation-related tasks, please report this as a bug.
### [HH1004: Incorrect source name casing](#HH1004)
You tried to resolve a Solidity file with an incorrect casing.
      
Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.
### [HH1005: Solidity source file not found](#HH1005)
A source name should correspond to an existing Solidity file but it doesn't.
      
Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.
### [HH1006: File from node_modules treated as local](#HH1006)
A file was treated as local but is inside a node_modules directory.
      
If you aren't overriding compilation-related tasks, please report this as a bug.
### [HH1007: File from outside the project treated as local](#HH1007)
A file was treated as local but is outside the project.
      
If you aren't overriding compilation-related tasks, please report this as a bug.

## Contract name errors
### [HH1100: Invalid fully qualified contract name](#HH1100)
A contract name was expected to be in fully qualified form, but it's not.

A fully qualified name should look like file.sol:Contract
