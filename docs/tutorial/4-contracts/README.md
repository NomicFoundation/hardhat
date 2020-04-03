# 4. Creating and compiling smart contracts

Now onto the fun stuff! 

We will create a simple token smart contract. Token contracts are used (mostly) to exchange or store value. We won't focus on the Solidity code on this tutorial, but there are some important features you need to know:

- There is a fixed amount of tokens and cannot be changed
- The fixed amount of tokens is assigned to the address that deploys the contract
- Anyone can receive tokens
- Anyone with at least one token can transfer tokens
- The token is non divisible, you might transfer 1, 2, 3 or 37 tokens but not 2.5

::: tip
You might have heard about ERC20s. ERC20 is a token standard in Ethereum. Tokens such as DAI, USDC, LINK and MANA follow the ERC20 standard. [explain more?]
:::

## Creating smart contracts

Start by creating a new folder named `contracts`. Create a file inside `contracts` named `Token.sol`. Open it with your favorite IDE, copy and paste the code below. Take a minute or so to read the code, it's pretty straightforward and it's filled with comments explaining the basics of Solidity.

::: tip
`*.sol` stands for Solidity. You don't need to match the file and the contract name, but it is common practice and we recommend doing so. 
:::

```c
pragma solidity ^0.5.15;

contract Token {

    // Some string type variables to identify the token
    string public name = "My Awesome Token";
    string public symbol = "MAT";
    // The fixed amount of tokens stored in an unsigned integer type variable
    uint256 public totalSupply = 1000;
    // An address type variable is used to store ethereum accounts
    address public owner = address(0);
    // A mapping works like a key/value array, here we store each account balance
    mapping(address => uint256) balances;
    
    // The `constructor` is executed only once when the contract is created
    // The `public` modifier makes a function callable from outside a contract
    constructor() public {
        // The totalSupply is assigned to transaction sender
        // In other words, whoever deploys the contract will receive all the tokens
        balances[msg.sender] = totalSupply;
        owner = msg.sender;
    }

    // A function to transfer tokens
    // The `external` modifier makes a function ONLY callable from outside a contract
    function transfer(address to, uint256 amount) external {
        // Check if the transaction sender has enough tokens to transfer
        // If `require` evaluates `false` then the transaction is reverted
        require(balances[msg.sender] >= amount, "Not enough tokens");
        // Transfer the amount
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    // Read only function to retrieve the token balance of a determined account
    // The `view` modifier allows us to call this function without executing a transaction
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

}
```

[podríamos explicar más el código en comments]


::: tip
You might want to add some Solidity support to your IDE. Just look for Solidity or Ethereum plugins. We recommend using VS Code or Sublime Text 3. If you don't know how to do this, feel free to reach us!
::: 


## Compiling smart contracts
While Solidity 0.6.x has been recently released, our recommendation is to stick with 0.5.15 for this tutorial. Some tools and libraries haven't been fully migrated yet, and you don't want to spend your time debugging those.

To compile your contracts, run the task `npx buidler compile`. As we mentioned in the previous section, there are some tasks that come built-in in **Buidler** so you don't need to worry on how this is handled under the hood.

```
$ npx buidler compile
Compiling...
Compiled 1 contract successfully
```

The contract has been successfully compiled and it's ready to be used. Let's go ahead to the next section and write some tests.


## Note on function modifiers
Contracts functions be constant (i.e. pure or view) or non-constant. These are treated differently from outside of Solidity.

Calling a constant function doesn't modify the Ethereum state, so no transaction needs to be sent, and there's no associated gas cost to calling it.

Calling a non-constant function, normally modifies the Ethereum state, so you have to call them with a transaction.

You won't have to worry about this because we are going to use ethers.js to interact with the contract. ether.js automatically knows what to do, but you should keep the distinction in mind, as constant functions will return a value, and non-constants won't. Also, normally have to wait from your transaction to get mined.
