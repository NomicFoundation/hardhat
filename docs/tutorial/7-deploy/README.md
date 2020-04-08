# 7. Deploying contracts
To deploy a smart contract you just need to get an `ethers` `ContractFactory` instance and use its deployment functionality we already saw.

Create a new directory `scripts` inside the project root's folder.

```
mkdir scripts
touch scripts/deploy.js
```

Copy and paste the `deploy.js` script:

```js
const fs = require("fs");

async function main() {
  if (network.name === "buidlerevm") {
    throw new Error(
      `You are trying to deploy a contract to the Buidler EVM network, which gets automatically created and destroyed every time. Use the Buidler option '--network localhost'`
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );
  
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy();

  console.log("Token address:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

You can run the script with `npx buidler run scripts/deploy.js --network <network-name>`.

The `--network` parameters indicates which network we want to deploy to. If none is provided, Buidler will start a new instance of Buidler EVM, deploy your contracts into it, and then destroy it, which wouldn't be useful.

Buidler has multiple networks already setup:
- `buidlerevm`
- `localhost`: a local testing network powered by `buidlerevm`
- `mainnet`: the main Ethereum network.
- Testnets:
  - `ropsten`
  - `kovan`
  - `rinkeby`
  - `gorli`

::: tip
You need to have ETH in the account that you are going to use to deploy your contracts. You can get some for testnets from faucet, a service that distributes testing-ETH for free: 

* [Ropsten faucet](https://faucet.metamask.io/)
* [Kovan faucet](https://faucet.kovan.network/)
* [Rinkeby faucet](https://faucet.rinkeby.io/)
* [Gorli faucet](https://goerli-faucet.slock.it/)
:::


## Deploying to remote networks
To deploy to a remote network such as `mainnet` or any testnet, you need to add the `network` to your `buidler.config.js` file. We’ll use `rinkeby` for this example, but you can add any network similarly:

```js
usePlugin("@nomiclabs/buidler-waffle");

const INFURA_API_KEY = "YOUR INFURA API KEY";
const RINKEBY_PRIVATE_KEY = "YOUR RINKEBY PRIVATE KEY";

module.exports = {
  networks: {
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [RINKEBY_PRIVATE_KEY]
    }
  }
};
```

We are using Infura as the Ethereum node endpoint, but any remote endpoint would work. 
