---
home: true 
heroImage: ./mascots.svg
actionText: Get Started
search: false
footer: MIT Licensed | Copyright © 2018-2019 Nomic Labs
---
<div>

  <div class="example-1">
  <h3>1. Write your contract</h3>

  ```js

  pragma solidity ^0.5.1;
      
  contract DeathStar {

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
  require("@nomiclabs/buidler-truffle5");
  require("@nomiclabs/buidler-ganache");

  // Automatically generate testable contracts where
  // internal methods are exposed as external.
  require("@nomiclabs/buidler-autoexternal");

  // Linting
  require("@nomiclabs/buidler-solhint");

  // For scripts
  require("@nomiclabs/buidler-ethers");
  require("@nomiclabs/buidler-faucets");

  // Faster compilation
  require("@nomiclabs/buidler-docker-solc");

  module.exports = {};
  ```

  </div>

  <div class="clear"></div>

  <div class="example-3">
  <h3>3. Write your tasks</h3>

  ```js


  task("shoot", "Shoots the laser. Handle with care.")
    .addParam("target", "The target planet")
    .setAction(async (target) => {
      const DeathStar = artifacts.require("DeathStar");
      await DeathStar.at(..).shoot(target);
      
      console.log("Target destroyed.")
    });


  module.exports = {};


  ```

  </div>


  <div class="example-4">
  <h3>4. Interact with your contract easily</h3>

  ```sh
  $ npx buidler help shoot
  Buidler version 1.0.0-beta.2

  Usage: buidler [GLOBAL OPTIONS] shoot --target <STRING>

  OPTIONS:

      --target      The target planet

  shoot: Shoots the laser. Handle with care.

  For global options help run: buidler help

  $ npx buidler shoot --target alderaan
  Target destroyed.
  ```

  </div>
  <div class="clear"></div>
</div>
