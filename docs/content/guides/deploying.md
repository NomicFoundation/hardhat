# Deploying your contracts

When it comes to deploying, there are no official plugins that implement a deployment system for Hardhat yet, but there's [an open issue](https://github.com/nomiclabs/hardhat/issues/381) with some ideas and we'd value your opinion on how to best design it.

In the meantime, we recommend deploying your smart contracts using scripts, or using [the hardhat-deploy community plugin](https://github.com/wighawag/hardhat-deploy/tree/master). You can deploy the `Greeter` contract from the sample project with a deploy script `scripts/deploy.js` like this:

```js
async function main() {
  // We get the contract to deploy
  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy("Hello, Hardhat!");

  console.log("Greeter deployed to:", greeter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

You can deploy in the `localhost` network following these steps:

1. Start a [local node](../getting-started/#connecting-a-wallet-or-dapp-to-hardhat-network)

   `npx hardhat node`

2. Open a new terminal and deploy the smart contract in the `localhost` network

   `npx hardhat run --network localhost scripts/deploy.js`

As general rule, you can target any network configured in the `hardhat.config.js`

`npx hardhat run --network <your-network> scripts/deploy.js`

### Truffle migrations support

You can use Hardhat alongside Truffle if you want to use its migration system. Your contracts written using Hardhat will just work with Truffle.

All you need to do is install Truffle and follow their [migrations guide](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations).
