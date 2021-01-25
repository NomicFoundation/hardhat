# Deploying your contracts

When it comes to deploying, there are no plugins that implement
a deployment system for Hardhat yet, but there's
[an open issue](https://github.com/nomiclabs/hardhat/issues/381)
with some ideas and we'd value your opinion on how to best design it.

In the meantime, we recommend deploying your smart contracts using
scripts. You can deploy the `Greeter` contract from the sample project
with the deploy script `scripts/sample-script.js`:

```js
async function main() {
  // We get the contract to deploy
  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy("Hello, Hardhat!");

  console.log("Greeter deployed to:", greeter.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

You can run it with

```
npx hardhat run --network <your-network> scripts/sample-script.js
```

### Truffle migrations support

You can use Hardhat alongside Truffle if you want to use its migration system.
Your contracts written using Hardhat will just work with Truffle.

All you need to do is install Truffle and follow their [migrations guide](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations).
