---
home: true 
heroImage: ./mascots.svg
actionText: Get Started
search: false
footer: Copyright © 2018-2019 Nomic Labs LLC
---
<div>

  <div class="example-1">
  <h3>1. Write your contract</h3>

  ```js

  import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

  pragma solidity ^0.5.1;
      
  contract DeathStar is ERC721 {

    address private owner;

    constructor (address owner) public {
      owner = owner;
    }

    function shoot(string memory planet) public {
      require(msg.sender == owner);
      // TODO: BAM
    }
  }

  ```

  </div>


  <div class="example-2">
  <h3>2. Choose your plugins & setup</h3>

  ```js
  // For unit tests
  usePlugin("@nomiclabs/buidler-truffle5");
  usePlugin("@nomiclabs/buidler-ganache");
  usePlugin("buidler-gas-reporter");

  // Linting
  usePlugin("@nomiclabs/buidler-solhint");

  // For scripts
  usePlugin("@nomiclabs/buidler-ethers");
  
  // Faster compilation
  usePlugin("@nomiclabs/buidler-docker-solc");

  module.exports = {
    buidlerevm: {
      throwOnTransactionFailures: true
    }
  };
  ```

  </div>

  <div class="clear"></div>

  <div class="example-3">
  <h3>3. Write your tests</h3>

```js
contract('ERC721', function () {
  describe('safeTransferFrom to a contract that does not implement the required function', function () {
    it('reverts', async function () {

      const invalidReceiver = this.token;

      await this.token.safeTransferFrom(
        owner,
        invalidReceiver.address,
        tokenId,
        { from: owner }
      )        
    });
  });
});
```

  </div>


  <div class="example-4">
  <h3>4. Debug your code with Buidler EVM</h3>

  ```
$ npx buidler test

Contract: DeathStar
    safeTransferFrom to a contract that does not implement the required function:

Error: Transaction reverted: function selector was not recognized and there's no fallback function
    at DeathStar.<unrecognized-selector> (contracts/DeathStar.sol:9)
    at DeathStar._checkOnERC721Received (contracts/token/ERC721/ERC721.sol:334)
    at DeathStar._safeTransferFrom (contracts/token/ERC721/ERC721.sol:196)
    at DeathStar.safeTransferFrom (contracts/token/ERC721/ERC721.sol:179)
    at DeathStar.safeTransferFrom (contracts/token/ERC721/ERC721.sol:162)
    at TruffleContract.safeTransferFrom (node_modules/@nomiclabs/truffle-contract/lib/execute.js:157:24)
    at Context.<anonymous> (test/DeathStar-test.js:321:26)


  ```

  </div>
  <div class="clear"></div>
</div>
