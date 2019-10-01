# Buidler EVM

Buidler comes built-in with Buidler EVM, a development network to deploy
and run your contracts on, facilitating testing and debugging. Buidler EVM is 
based on [`ethereumjs-vm`](https://github.com/ethereumjs/ethereumjs-vm), 
just like Remix and Ganache, so you don't have to worry about consensus bugs. 

By default, an instance of Buidler EVM will be automatically created when
your run a task, script or test your smart contracts. You don't need to
do anything to enable it.

## Solidity stack traces

Buidler EVM has first-class Solidity support. It always knows which
smart contracts are being run, what they do exactly and why they fail.

If a transaction or call fails, Buidler EVM will throw an exception.
This exception will have a combined JavaScript and Solidity stack
trace: stack traces that start in JavaScript/TypeScript up to your
call to the contract, and continue with the full Solidity call stack.

This is an example of a Buidler EVM exception:

```
Error: Transaction reverted: function selector was not recognized and there's no fallback function
  at ERC721Mock.<unrecognized-selector> (contracts/mocks/ERC721Mock.sol:9)
  at ERC721Mock._checkOnERC721Received (contracts/token/ERC721/ERC721.sol:334)
  at ERC721Mock._safeTransferFrom (contracts/token/ERC721/ERC721.sol:196)
  at ERC721Mock.safeTransferFrom (contracts/token/ERC721/ERC721.sol:179)
  at ERC721Mock.safeTransferFrom (contracts/token/ERC721/ERC721.sol:162)
  at TruffleContract.safeTransferFrom (node_modules/@nomiclabs/truffle-contract/lib/execute.js:157:24)
  at Context.<anonymous> (test/token/ERC721/ERC721.behavior.js:321:26)
```

The last two lines correspond to the JavaScript test code that executed a
failing transaction. The rest is the Solidity stack trace.
This way you know exactly why your tests aren't passing.

## Automatic error messages

Buidler EVM always knows why your transaction or call failed, and uses this
information to make debugging your contracts easier.

When a transaction fails without a reason, Buidler EVM will create a clear
error message in the following cases:

- Calling a non-payable function with ETH

- Sending ETH to a contract without a payable fallback function

- Calling a non-existent function when there's no fallback function

- Calling a function with incorrect parameters

- Calling an external function that doesn't return the right amount of data

- Calling an external function on a non-contract account

- Failing to execute an external call because of its parameters (e.g. trying to send too much ETH)

- Calling a library without `DELEGATECALL`

- Incorrectly calling a precompiled contract

## Limitations

### Supported Solidity versions

Buidler EVM can run any smart contract, but it only understands Solidity 0.5.1 and newer.

If you are compiling with an older version of Solidity, or using another language, you can use Buidler EVM, but
Solidity stack traces won't be generated.

### Solidity optimizer support

Buidler EVM can work with smart contracts compiled with optimizations,
but this may lead to your stack traces' line numbers being a little off.

We recommend compiling without optimizations when testing and debugging
your contracts.
