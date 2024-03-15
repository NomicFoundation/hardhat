# 6. Debugging with Hardhat Network

Hardhat comes built-in with Hardhat Network, a local Ethereum network designed for development. It allows you to deploy your contracts, run your tests and debug your code, all within the confines of your local machine. It's the default network that Hardhat connects to, so you don't need to set up anything for it to work. Just run your tests.

## Solidity `console.log`

When running your contracts and tests on Hardhat Network you can print logging messages and contract variables calling `console.log()` from your Solidity code. To use it you have to import `hardhat/console.sol` in your contract code.

This is what it looks like:

```solidity{3}
pragma solidity {LATEST_PRAGMA};

import "hardhat/console.sol";

contract Token {
  //...
}
```

Then you can just add some `console.log` calls to the `transfer()` function as if you were using it in JavaScript:

```solidity{4-9}
function transfer(address to, uint256 amount) external {
    require(balances[msg.sender] >= amount, "Not enough tokens");

    console.log(
        "Transferring from %s to %s %s tokens",
        msg.sender,
        to,
        amount
    );

    balances[msg.sender] -= amount;
    balances[to] += amount;

    emit Transfer(msg.sender, to, amount);
}
```

The logging output will show when you run your tests:

```markup{8-9,12-13}
$ npx hardhat test

  Token contract
    Deployment
      ✓ Should set the right owner
      ✓ Should assign the total supply of tokens to the owner
    Transactions
Transferring from 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 to 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 50 tokens
Transferring from 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 to 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc 50 tokens
      ✓ Should transfer tokens between accounts (373ms)
      ✓ Should fail if sender doesn’t have enough tokens
Transferring from 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 to 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 50 tokens
Transferring from 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 to 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc 50 tokens
      ✓ Should update balances after transfers (187ms)


  5 passing (2s)
```

Check out the [documentation](/hardhat-network/index.md#console.log) to learn more about this feature.
