![](https://raw.githubusercontent.com/NomicFoundation/hardhat/main/img/hardhat-header.png)

Hardhat is an Ethereum development environment for professionals. It facilitates performing frequent tasks, such as running tests, automatically checking code for mistakes or interacting with smart contracts.

Built by the [Nomic Foundation](https://nomic.foundation/) for the Ethereum community.

---

> 💡 This is the README for Hardhat 3, the new major version of Hardhat. For the previous version (v2), see [this branch](https://github.com/NomicFoundation/hardhat/tree/v2) instead.

---

## Getting started

To install Hardhat and initialize a new project, run the following command in an empty directory:

```bash
npx hardhat --init
```

This will take you through an interactive setup process to get started.

## Learn more

To learn more about Hardhat, check out the [documentation](https://hardhat.org/docs/).

## Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.

Go to [CONTRIBUTING.md](https://github.com/NomicFoundation/hardhat/blob/main/CONTRIBUTING.md) to learn about how to set up Hardhat's development environment.
## Basic Deploy Script Example

```js
const hre = require("hardhat");

async function main() {
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy();

  await token.deployed();
  console.log("Token deployed to:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
