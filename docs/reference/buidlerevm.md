# Buidler EVM

Buidler comes built-in with Buidler EVM, a development network to deploy 
and run your contracts on, facilitating testing and debugging.

An instance of Buidler EVM will be automatically created when your run a 
task, script or test your smart contracts.
 

## Solidity stack traces

Buidler EVM has first-class support of Solidity. It always knows which 
smart contracts are being run and knows exactly what they do and why 
they fail.


If a transaction or call fails, Buidler EVM will throw a exception. 
This exception will have a combined JavaScript and Solidity stack
trace: stack traces that start in JavaScript/TypeScript up to your 
call to Buidler EVM, and continue with the full Solidity call stack.

This is an example of a Buidler EVM exception:

```

```
 
- Transaction failure reason identification and providing a more informative error message (e.g. "fallback function not payable and called with value")

Buidler EVM is built-in with Buidler and you don't need to do anything to enable it. By running `buidler test` the tests will run against it and show a stack trace and error message if the transaction fails.

Buidler EVM works with Solidity 0.5.1 and newer.


// TODO: complete
