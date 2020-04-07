# 6. Debugging contracts with Buidler EVM
Buidler comes built-in with Buidler EVM, a local Ethereum network designed for development. It allows you to deploy your contracts, run your tests and debug your code.

## Solidity stack traces
Buidler EVM has first-class Solidity support. It always knows which smart contracts are being run, what they do exactly and why they fail.

As we saw in the previous section, if a transaction or call fails, Buidler EVM will throw an exception. This exception will have a combined JavaScript and Solidity stack trace: stack traces that start in JavaScript/TypeScript up to your call to the contract, and continue with the full Solidity call stack.

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

## Solidity `console.log`
When running your contracts on Buidler EVM, you can use `console.log` from Solidity. This is very helpful to understand the state of your contract, and why your transactions are failing.

Let's add a `console.log` to our `Token.sol` contract.

All you need to do is to import the console library. Add it between the `pragma` and `contract` instructions:

```c{3}
pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";

contract Token {
  //...
}
```

Add some `console.log` to the `transfer()` function as you were using it in JavaScript:

```c{2,3}
function transfer(address to, uint256 amount) external {
    console.log("Sender balance is %s tokens", balances[msg.sender]);
    console.log("Trying to send %s tokens to %s", amount, to);
    require(balances[msg.sender] >= amount, "Not enough tokens");
    balances[msg.sender] -= amount;
    balances[to] += amount;
}
```

Run your tests again to see it in action.
