# 11. Deploying to a live network

Once you're ready to share your dApp with other people what you may want to do is deploy to a live network. This way others can access an instance that's not running locally on your system. 

There's the Ethereum network that deals with real money which is called "mainnet", and then there are other live networks that don't deal with real money but do mimic the real world scenario well, and can be used by others as a shared staging environment. These are called "testnets" and Ethereum has multiple ones: *Ropsten*, *Kovan*, *Rinkeby* and *Goerli*. We recommend you deploy your contracts to the *Ropsten* testnet.

At the software level, deploying to a testnet is the same as deploying to mainnet. The only difference is which network you connect to. 


## Deploying to remote networks
To deploy to a remote network such as mainnet or any testnet, you need to add a `network` entry to your `buidler.config.js` file. We’ll use Ropsten for this example, but you can add any network similarly:

```js{5,11,14-19}
usePlugin("@nomiclabs/buidler-waffle");

// Go to https://infura.io/ and create a new project
// Replace this with your Infura project ID
const INFURA_PROJECT_ID = "YOUR INFURA PROJECT ID";

// Replace this private key with your Ropsten account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Be aware of NEVER putting real Ether into testing accounts
const ROPSTEN_PRIVATE_KEY = "YOUR ROPSTEN PRIVATE KEY";

module.exports = {
  networks: {
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${ROPSTEN_PRIVATE_KEY}`]
    }
  }
};
```
We're using [Infura](https://infura.io/), but pointing `url` to any Ethereum node or gateway would work. Go grab your `INFURA_PROJECT_ID` and come back.

To deploy on Ropsten you need to send ropsten-ETH into the address that's going to be making the deployment. You can get some ETH for testnets from a faucet, a service that distributes testing-ETH for free. [Here's the one for Ropsten](https://faucet.metamask.io/), you'll have to change Metamask's network to Ropsten before transacting. 

::: tip
You can get some ETH for other testnets following these links: 

* [Kovan faucet](https://faucet.kovan.network/)
* [Rinkeby faucet](https://faucet.rinkeby.io/)
* [Goerli faucet](https://goerli-faucet.slock.it/)
:::

Finally, run:
```
npx buidler run scripts/deploy.js --network ropsten
```

If everything went well, you should see the deployed contract address.

