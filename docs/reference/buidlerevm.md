# Buidler EVM (stack traces development network)

Buidler comes built-in with a development network to deploy and run your contracts on, facilitating testing. Functionally, it's similar to `ganache` in terms of its role in automated testing -- with the exception that Buidler EVM is Solidity-aware and provides extended error messaging functionality. This means:

- Stack traces that start in JavaScript/TypeScript and continue on to the Solidity call stack
- Transaction failure reason identification and providing a more informative error message (e.g. "fallback function not payable and called with value")

Buidler EVM is built-in with Buidler and you don't need to do anything to enable it. By running `buidler test` the tests will run against it and show a stack trace and error message if the transaction fails.

Buidler EVM works with Solidity 0.5.1 and newer.


// TODO: complete