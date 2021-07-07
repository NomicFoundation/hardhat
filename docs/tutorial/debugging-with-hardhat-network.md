# 6. Debugging with Hardhat Network

**Hardhat** comes built-in with **Hardhat Network**, a local Ethereum network designed for development. It allows you to deploy your contracts, run your tests and debug your code. It's the default network **Hardhat** connects to, so you don't need to setup anything for it to work. Just run your tests.

## Solidity `console.log`

When running your contracts and tests on **Hardhat Network** you can print logging messages and contract variables calling `console.log()` from your Solidity code. To use it you have to import **Hardhat**'s`console.log` from your contract code.

This is what it looks like:

```solidity{3}
pragma solidity ^0.6.0;

import "hardhat/console.sol";

contract Token {
  //...
}
```

Add some `console.log` to the `transfer()` function as if you were using it in JavaScript:

```solidity{2,3}
function transfer(address to, uint256 amount) external {
    console.log("Sender balance is %s tokens", balances[msg.sender]);
    console.log("Trying to send %s tokens to %s", amount, to);

    require(balances[msg.sender] >= amount, "Not enough tokens");

    balances[msg.sender] -= amount;
    balances[to] += amount;
}
```

The logging output will show when you run your tests:

```{8-11,14-17}
$ npx hardhat test

  Token contract
    Deployment
      ✓ Should set the right owner
      ✓ Should assign the total supply of tokens to the owner
    Transactions
Sender balance is 1000 tokens
Trying to send 50 tokens to 0xead9c93b79ae7c1591b1fb5323bd777e86e150d4
Sender balance is 50 tokens
Trying to send 50 tokens to 0xe5904695748fe4a84b40b3fc79de2277660bd1d3
      ✓ Should transfer tokens between accounts (373ms)
      ✓ Should fail if sender doesn’t have enough tokens
Sender balance is 1000 tokens
Trying to send 100 tokens to 0xead9c93b79ae7c1591b1fb5323bd777e86e150d4
Sender balance is 900 tokens
Trying to send 100 tokens to 0xe5904695748fe4a84b40b3fc79de2277660bd1d3
      ✓ Should update balances after transfers (187ms)


  5 passing (2s)
```

Check out the [documentation](/hardhat-network/README.md#console-log) to learn more about this feature.
