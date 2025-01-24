# Migrating from hardhat-deploy

This guide will walk you through migrating your Hardhat project to Hardhat Ignition from `hardhat-deploy`, a community plugin for deploying smart contracts used within the Hardhat community.

## Installing Hardhat Ignition

To get started, we’ll uninstall the `hardhat-deploy` plugin and install the Hardhat Ignition one by executing the following steps:

1. Remove the `hardhat-deploy` packages from your project:

   ::::tabsgroup{options="npm,yarn,pnpm"}

   :::tab{value="npm"}

   ```sh
   npm uninstall hardhat-deploy hardhat-deploy-ethers
   ```

   :::

   :::tab{value=yarn}

   ```sh
   yarn remove hardhat-deploy hardhat-deploy-ethers
   ```

   :::

   :::tab{value="pnpm"}

   ```sh
   pnpm remove hardhat-deploy hardhat-deploy-ethers
   ```

   :::

   ::::

2. Install the Hardhat Ignition package and `hardhat-network-helpers` to provide additional testing support as a replacement for `hardhat-deploy` functionality like EVM snapshots:

   ::::tabsgroup{options="npm,yarn,pnpm"}

   :::tab{value="npm"}

   ```sh
   npm install --save-dev @nomicfoundation/hardhat-ignition-ethers @nomicfoundation/hardhat-network-helpers
   ```

   :::

   :::tab{value=yarn}

   ```sh
   yarn add --dev @nomicfoundation/hardhat-ignition-ethers @nomicfoundation/hardhat-network-helpers
   ```

   :::

   :::tab{value="pnpm"}

   ```sh
   pnpm add -D @nomicfoundation/hardhat-ignition-ethers @nomicfoundation/hardhat-network-helpers
   ```

   :::

   ::::

3. Update the project’s `hardhat.config` file to remove `hardhat-deploy` and `hardhat-deploy-ethers` and instead import Hardhat Ignition:

   ::::tabsgroup{options="typescript,javascript"}

   :::tab{value="typescript"}

   ```git
   - import "hardhat-deploy";
   - import "hardhat-deploy-ethers";
   + import "@nomicfoundation/hardhat-ignition-ethers";
   ```

   :::

   :::tab{value=javascript}

   ```git
   - require("hardhat-deploy");
   - require("hardhat-deploy-ethers");
   + require("@nomicfoundation/hardhat-ignition-ethers");
   ```

   :::

   ::::

## Convert deployment scripts to Ignition Modules

`hardhat-deploy` represents contract deployments as JavaScript or TypeScript files under the `./deploy/` folder. Hardhat Ignition follows a similar pattern with deployments encapsulated as modules; these are JS/TS files stored under the `./ignition/modules` directory. Each `hardhat-deploy` deploy file will be converted or merged into a Hardhat Ignition module.

Let’s first create the required folder structure under the root of your project:

```sh
mkdir ignition
mkdir ignition/modules
```

Now, let’s work through converting a simple `hardhat-deploy` script for this example `Token` contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Token {
    uint256 public totalSupply = 1000000;
    address public owner;
    mapping(address => uint256) balances;

    constructor(address _owner) {
        balances[_owner] = totalSupply;
        owner = _owner;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Not enough tokens");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
```

A `hardhat-deploy` deploy function for the Token contract might look like this:

```typescript
// ./deploy/001_deploy_token.ts
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  /*
   The deploy function uses the hardhat-deploy named accounts feature
   to set the deployment's `from` and `args` parameters.
  */
  const { deployer, tokenOwner } = await getNamedAccounts();
  await deploy("Token", {
    from: deployer,
    args: [tokenOwner],
    log: true,
  });
};
export default func;
```

Using an Ignition Module, the equivalent account access code would look like this:

::::tabsgroup{options="typescript,javascript"}

:::tab{value="typescript"}

```typescript
// ./ignition/modules/Token.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/*
 The callback passed to `buildModule()` provides a module builder object `m`
 as a parameter. Through this builder object, you access the Module API.
 For instance, you can deploy contracts via `m.contract()`.
*/
export default buildModule("TokenModule", (m) => {
  /*
   Instead of named accounts, you get access to the configured accounts
   through the `getAccount()` method.
  */
  const deployer = m.getAccount(0);
  const tokenOwner = m.getAccount(1);

  /*
   Deploy `Token` by calling `contract()` with the constructor arguments
   as the second argument. The account to use for the deployment transaction
   is set through `from` in the third argument, which is an options object.
  */
  const token = m.contract("Token", [tokenOwner], {
    from: deployer,
  });

  /*
   The call to `m.contract()` returns a future that can be used in other `m.contract()`
   calls (e.g. as a constructor argument, where the future will resolve to the
   deployed address), but it can also be returned from the module. Contract
   futures that are returned from the module can be leveraged in Hardhat tests
   and scripts, as will be shown later.
  */
  return { token };
});
```

:::

:::tab{value=javascript}

```javascript
// ./ignition/modules/Token.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/*
 The callback passed to `buildModule()` provides a module builder object `m`
 as a parameter. Through this builder object, you access the Module API.
 For instance, you can deploy contracts via `m.contract()`.
*/
module.exports = buildModule("TokenModule", (m) => {
  /*
   Instead of named accounts, you get access to the configured accounts
   through the `getAccount()` method.
  */
  const deployer = m.getAccount(0);
  const tokenOwner = m.getAccount(1);

  /*
   Deploy `Token` by calling `contract()` with the constructor arguments
   as the second argument. The account to use for the deployment transaction
   is set through `from` in the third argument, which is an options object.
  */
  const token = m.contract("Token", [tokenOwner], {
    from: deployer,
  });

  /*
   The call to `m.contract()` returns a future that can be used in other `m.contract()`
   calls (e.g. as a constructor argument, where the future will resolve to the
   deployed address), but it can also be returned from the module. Contract
   futures that are returned from the module can be leveraged in Hardhat tests
   and scripts, as will be shown later.
  */
  return { token };
});
```

:::

::::

The conversion to an Ignition module can be tested by running the module against Hardhat Network:

```sh
npx hardhat ignition deploy ./ignition/modules/Token.ts
```

Which, if working correctly, will output the contract’s deployed address:

```
You are running Hardhat Ignition against an in-process instance of Hardhat Network.
This will execute the deployment, but the results will be lost.
You can use --network <network-name> to deploy to a different network.

Hardhat Ignition 🚀

Deploying [ TokenModule ]

Batch #1
  Executed Token#Token

[ Token ] successfully deployed 🚀

Deployed Addresses
Token#Token - 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

To learn more, check out the detailed [guide on writing Hardhat Ignition modules](/ignition/docs/guides/creating-modules), which showcases all available features.

## Migrating tests that rely on hardhat-deploy fixtures

Let’s go over the process of rewriting Hardhat tests that rely on `hardhat-deploy` fixture functionality. Using `hardhat-deploy`, calls to `fixture()` deploy everything under the `./deploy` and create a snapshot in the in-memory Hardhat node at the end of the first run. Subsequent calls to `fixture()` revert to the saved snapshot, avoiding rerunning the deployment transactions and thus saving time.

To do this, `hardhat-deploy-ethers` enhances the Hardhat `ethers` object with a `getContract` method that will return contract instances from the fixture snapshot.

```typescript
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, deployments, getNamedAccounts } from "hardhat";

describe("Token contract", function () {
  it("should assign the total supply of tokens to the owner", async function () {
    // Create fixture snapshot
    await deployments.fixture();

    // This will get an instance from the snapshot
    const token: Contract = await ethers.getContract("Token");

    const { tokenOwner } = await getNamedAccounts();
    expect(await token.balanceOf(tokenOwner)).to.equal(
      await token.totalSupply()
    );
  });
});
```

Hardhat Ignition, in conjunction with the `hardhat-network-helpers` plugin, also allows you to use fixtures:

::::tabsgroup{options="typescript,javascript"}

:::tab{value="typescript"}

```typescript
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, ignition } from "hardhat";
import TokenModule from "../ignition/modules/Token";

describe("Token contract", function () {
  async function deployTokenFixture() {
    /*
     Hardhat Ignition adds an `ignition` object to the Hardhat Runtime Environment
     that exposes a `deploy()` method. The `deploy()` method takes an Ignition
     module and returns the results of the Ignition module, where each
     returned future has been converted into an *ethers* contract instance.
    */
    const { token } = await ignition.deploy(TokenModule);

    return { token };
  }

  it("should assign the total supply of tokens to the owner", async function () {
    /*
     The snapshot feature of `hardhat-deploy` fixtures is replicated
     by the call to the `hardhat-network-helpers` function `loadFixture()`.
     For a given fixture function, `loadFixture()` will snapshot the in-memory
     Hardhat node, and will revert to the snapshot if called with the same
     function again.
    */
    const { token } = await loadFixture(deployTokenFixture);

    const [, tokenOwner] = await ethers.getSigners();
    expect(await token.balanceOf(tokenOwner)).to.equal(
      await token.totalSupply()
    );
  });
});
```

:::

:::tab{value=javascript}

```javascript
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, ignition } = require("hardhat");
const TokenModule = require("../ignition/modules/Token");

describe("Token contract", function () {
  async function deployTokenFixture() {
    /*
     Hardhat Ignition adds an `ignition` object to the Hardhat Runtime Environment
     that exposes a `deploy()` method. The `deploy()` method takes an Ignition
     module and returns the results of the Ignition module, where each
     returned future has been converted into an *ethers* contract instance.
    */
    const { token } = await ignition.deploy(TokenModule);

    return { token };
  }

  it("should assign the total supply of tokens to the owner", async function () {
    /*
     The snapshot feature of `hardhat-deploy` fixtures is replicated
     by the call to the `hardhat-network-helpers` function `loadFixture()`.
     For a given fixture function, `loadFixture()` will snapshot the in-memory
     Hardhat node, and will revert to the snapshot if called with the same
     function again.
    */
    const { token } = await loadFixture(deployTokenFixture);

    const [, tokenOwner] = await ethers.getSigners();
    expect(await token.balanceOf(tokenOwner)).to.equal(
      await token.totalSupply()
    );
  });
});
```

:::

::::

Once converted, tests can be checked in the standard way:

```sh
npx hardhat test
```
