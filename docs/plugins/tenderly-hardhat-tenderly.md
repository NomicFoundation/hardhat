---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/Tenderly/hardhat-tenderly/tree/master)
:::

![npm (tag)](https://img.shields.io/npm/v/@tenderly/hardhat-tenderly/latest?color=23C197&labelColor=060e18&style=for-the-badge)


# hardhat-tenderly

[Hardhat](http://hardhat.org) plugin for integration with [Tenderly](https://tenderly.co/). 

## What

This plugin will help you verify your Solidity contracts, as well as allow you to 
privately push contracts to [Tenderly](https://tenderly.co/).

## Installation

```bash
npm install --save-dev @tenderly/hardhat-tenderly
```

And add the following statement to your `hardhat.config.js`:

```js
require("@tenderly/hardhat-tenderly");
```

Or, if you are using typescript:

```ts
import "@tenderly/hardhat-tenderly"
```

## Tasks

This plugin adds the _`tenderly:verify`_ task to Hardhat:
```
Usage: hardhat [GLOBAL OPTIONS] tenderly:verify ...contracts

POSITIONAL ARGUMENTS:

  contracts     Addresses and names of contracts that will be verified formatted ContractName=Address 

tenderly-verify: Verifies contracts on Tenderly
```

And the `tenderly:push` task:
```
Usage: hardhat [GLOBAL OPTIONS] tenderly:push ...contracts

POSITIONAL ARGUMENTS:

  contracts     Addresses and names of contracts that will be verified formatted ContractName=Address 

tenderly-push: Privately pushes contracts to Tenderly
```

## Environment extensions

This plugin extends the Hardhat Runtime Environment by adding a `tenderly` field
whose type is `Tenderly`.

This field has the `verify` and `push` methods.

This is an example on how you can call it from your scripts (using ethers to deploy a contract):
```js
    const Greeter = await ethers.getContractFactory("Greeter");
    const greeter = await Greeter.deploy("Hello, Hardhat!");

    await bre.tenderly.verify({
        name: "Greeter",
        address: greeter.address,
    })
```

Both functions accept variadic parameters:
```js
    const contracts = [
    {
        name: "Greeter",
        address: "123"
    },
    {
        name: "Greeter2",
        address: "456"
    }]

    await bre.tenderly.verify(...contracts)
```

## Configuration

This plugin extends the `HardhatConfig` object with optional 
`project` and `username` fields.

This is an example of how to set it:

```js
module.exports = {
    tenderly: {
        project: "",
        username: "",
    }
};
```

## Usage

For this plugin to function you need to create a `config.yaml` file at 
`$HOME/.tenderly/config.yaml` or `%HOMEPATH%\.tenderly\config.yaml` and add an `access_key` field to it:
```yaml
access_key: super_secret_access_key
```

You can find the access token on the [Tenderly dashboard](https://dashboard.tenderly.co/), 
under _Settings -> Authorization_.

*Alternatively*, this step can be skipped by doing `tenderly login` on the `tenderly-cli`

After this you can access [Tenderly](https://tenderly.co/) through the Hardhat Runtime Environment anywhere 
you need it (tasks, scripts, tests, etc).
