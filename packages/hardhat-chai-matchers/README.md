[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-chai-matchers.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-chai-matchers)

# Hardhat Chai Matchers

This plugin adds Ethereum-specific capabilities to the [Chai](https://chaijs.com/) assertion library, making your smart contract tests easy to write and read.

Check [its documentation](https://hardhat.org/hardhat-chai-matchers/docs) to learn more.

### Installation

We recommend using npm 7 or later. If you do that, then you just need to install the plugin itself:

```bash
npm install --save-dev @nomicfoundation/hardhat-chai-matchers
```

If you are using an older version of npm, you'll also need to install all the packages used by the plugin.

```bash
npm install --save-dev @nomicfoundation/hardhat-chai-matchers chai @nomicfoundation/hardhat-ethers ethers
```

That's also the case if you are using yarn:

```bash
yarn add --dev @nomicfoundation/hardhat-chai-matchers chai @nomicfoundation/hardhat-ethers ethers
```

### Usage

After installing it, add the plugin to your Hardhat config:

```js
require("@nomicfoundation/hardhat-chai-matchers");
```

Then you'll be able to use the matchers in your tests:

```js
expect(await token.totalSupply()).to.equal(1_000_000);

await expect(token.transfer(token, 1000)).to.be.revertedWith(
  "Cannot transfer to the contract itself"
);

await expect(token.transfer(recipient, 1000))
  .to.emit(token, "Transfer")
  .withArgs(owner, recipient, 1000);
```
