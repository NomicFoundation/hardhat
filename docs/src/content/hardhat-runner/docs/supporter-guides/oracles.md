---
title: Oracles
description: Oracles help get real-world data into your Ethereum application because smart contracts can't query real-world data on their own.
---

# Working with blockchain oracles

_This guide is based on the [ethereum.org oracles guide](https://ethereum.org/en/developers/docs/oracles)_

Oracles provide a bridge between the real-world and on-chain smart contracts by being a source of data that smart contracts can rely on, and act upon.

Oracles play a critical role in facilitating the full potential of smart contract utility. Without a reliable connection to real-world data, smart contracts cannot effectively serve the real-world.

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/ZJfkNzyO7-U" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Why are they needed?

With a blockchain like Ethereum, you need every node in the network to replay every transaction and end up with the same result, guaranteed. APIs introduce potentially variable data. If you were sending ETH based on an agreed $USD value using a price API, the query would return a different result from one day to the next. Not to mention, the API could be hacked or deprecated. If this happens, the nodes in the network wouldn't be able to agree on Ethereum's current state, effectively breaking [consensus](https://ethereum.org/developers/docs/consensus-mechanisms/).

Oracles solve this problem by posting the data on the blockchain. So any node replaying the transaction will use the same immutable data that's posted for all to see. To do this, an oracle is typically made up of a smart contract and some off-chain components that can query APIs, then periodically send transactions to update the smart contract's data.

## The oracle problem

As we mentioned, blockchain transactions cannot access off-chain data directly. At the same time, relying on a single source of truth to provide data is insecure and invalidates the decentralization of a smart contract. This is known as the oracle problem.

We can avoid the oracle problem by using a decentralized oracle network, which pulls data from multiple sources; if one data source is hacked or fails, the smart contract will still function as intended.

## Security

An oracle is only as secure as its data source(s). If a dapp uses Uniswap as an oracle for its ETH/DAI price feed, an attacker can move the price on Uniswap to manipulate the dapp's understanding of the current price. An example of how to combat this is [a feed system](https://docs.makerdao.com/smart-contract-modules/oracle-module/oracle-security-module-osm-detailed-documentation) like the one used by MakerDAO, which collates price data from many external price feeds instead of just relying on a single source.

## Architecture

This is an example of simple Oracle architecture, however, there are more ways to trigger off-chain computation.

1. Emit a log with your [smart contract event](https://ethereum.org/developers/docs/smart-contracts/anatomy/#events-and-logs)
2. An off-chain service has subscribed (usually using something like the JSON-RPC `eth_subscribe` command) to these specific logs.
3. The off-chain service proceeds to do some tasks as defined by the log.
4. The off-chain service responds with the data requested in a secondary transaction to the smart contract.

This is how to get data in a 1 to 1 manner, however to improve security you may want to decentralize how you collect your off-chain data.

## Getting Price Data

Below is an example of how you can retrieve the latest ETH price in your smart contract using a Chainlink price feed on Goerli:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceConsumerV3 {

    AggregatorV3Interface internal priceFeed;

    /**
     * Network: Goerli
     * Aggregator: ETH/USD
     * Address: 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e
     */
    constructor() {
        priceFeed = AggregatorV3Interface(0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e);
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice() public view returns (int) {
        (int price) = priceFeed.latestRoundData();
        return price;
    }
}

```

## Randomness

Randomness in computer systems, especially on blockchains, is challenging to achieve because general-purpose blockchains like Ethereum do not have inherent randomness. Another problem is the public nature of blockchain technology which makes finding a secure source of entropy difficult. Almost any mechanism of generating on-chain randomness using Solidity is vulnerable to [MEV attacks](https://ethereum.org/en/developers/docs/mev/).

It is possible to generate the random value off-chain and send it on-chain, but doing so imposes high trust requirements on users. They must believe the value was truly generated via unpredictable mechanisms and wasn’t altered in transit.

Oracles designed for off-chain computation solve this problem by securely generating random outcomes off-chain that they broadcast on-chain along with cryptographic proofs attesting to the unpredictability of the process. An example is Chainlink VRF (Verifiable Random Function), which is a provably-fair and verifiable source of randomness designed for smart contracts. Smart contract developers can use Chainlink VRF as a tamper-proof random number generation (RNG) to build smart contracts for any applications which rely on unpredictable outcomes:

- Blockchain games and NFTs
- Random assignment of duties and resources (e.g. randomly assigning judges to cases)
- Choosing a representative sample for consensus mechanisms

Random numbers are difficult because blockchains are deterministic.

To start with Chainlink VRF, create a new `VRFv2Consumer.sol` smart contract, which you can get from the [Official Chainlink Documentation](https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number).

Usually, you will create and manage your subscriptions on the [VRF Subscription Management](https://vrf.chain.link/) page, but with the [`@chainlink/hardhat-chainlink`](https://www.npmjs.com/package/@chainlink/hardhat-chainlink) plugin, you can automate that process. This plugin will help you to use the Chainlink protocol inside your tests, scripts & tasks.

You will need to install it by typing:

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```
npm install --save-dev @chainlink/hardhat-chainlink
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev @chainlink/hardhat-chainlink
```

:::

:::tab{value="yarn"}

```
yarn add --dev @chainlink/hardhat-chainlink
```

:::

:::tab{value="pnpm"}

```
pnpm add -D @chainlink/hardhat-chainlink
```

:::

::::

And import it inside the `hardhat.config` file:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```ts
import "@chainlink/hardhat-chainlink";
```

:::

:::tab{value="JavaScript"}

```js
require("@chainlink/hardhat-chainlink");
```

:::

::::

Then you can just expand the deployment script which will deploy the above `VRFv2Consumer` smart contract and do the VRF Management part.

To do so, first prepare the `hardhat.config` file for the deployment on the Goerli network:

```ts
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY]
    }
  }
```

And after that, expand your deployment script:

```ts
// scripts/deploy.ts
import { chainlink, ethers } from "hardhat";

async function main() {
  // NOTE: If you already have an active VRF Subscription, proceed to step 3

  // Step 1: Create a new VRF Subscription
  const vrfCoordinatorAddress = `0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D`;
  const { subscriptionId } = await chainlink.createVrfSubscription(
    vrfCoordinatorAddress
  );

  // Step 2: Fund VRF Subscription
  const linkTokenAddress = `0x326C977E6efc84E512bB9C30f76E30c160eD06FB`;
  const amountInJuels = ethers.BigNumber.from(`1000000000000000000`); // 1 LINK
  await chainlink.fundVrfSubscription(
    vrfCoordinatorAddress,
    linkTokenAddress,
    amountInJuels,
    subscriptionId
  );

  // Step 3: Deploy your smart contract
  const VRFv2ConsumerFactory = await ethers.getContractFactory("VRFv2Consumer");
  const VRFv2Consumer = await VRFv2ConsumerFactory.deploy(subscriptionId);
  await VRFv2Consumer.deployed();
  console.log("VRFv2Consumer deployed to:", VRFv2Consumer.address);

  // Step 4: Add VRF Consumer contract to your VRF Subscription
  await chainlink.addVrfConsumer(
    vrfCoordinatorAddress,
    VRFv2Consumer.address,
    subscriptionId
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Finally, run the deployment script by typing:

```sh
npx hardhat run scripts/deploy.ts --network goerli
```

## Use blockchain oracles

There are multiple oracle applications you can integrate into your dapp:

- [Chainlink](https://chain.link/) - _Chainlink decentralized oracle networks provide tamper-proof inputs, outputs, and computations to support advanced smart contracts on any blockchain._

- [Witnet](https://witnet.io/) - _Witnet is a permissionless, decentralized, and censorship-resistant oracle helping smart contracts to react to real world events with strong crypto-economic guarantees._

- [Kleros Oracle](https://kleros.io/oracle) - _Crowd-sourced on-chain smart contract oracle in collaboration with the Reality.eth cryptoeconomic mechanism for verifying real-world events on-chain, a subjective oracle solution able to answer any question with a publicly verifiable answer._

- [UMA Oracle](https://umaproject.org/products/optimistic-oracle) - _UMA's optimistic oracle allows smart contracts to quickly and receive any kind of data for different applications, including insurance, financial derivatives, and prediction market._

- [Tellor](https://tellor.io/) - _Tellor is a transparent and permissionless oracle protocol for your smart contract to easily get any data whenever it needs it._

- [Band Protocol](https://bandprotocol.com/) - _Band Protocol is a cross-chain data oracle platform that aggregates and connects real-world data and APIs to smart contracts._

- [Provable](https://provable.xyz/) - _Provable connects blockchain dapps with any external Web API and leverages TLSNotary proofs, Trusted Execution Environments (TEEs), and secure cryptographic primitives to guarantee data authenticity._

- [Paralink](https://paralink.network/) - _Paralink provides an open source and decentralized oracle platform for smart contracts running on Ethereum and other popular blockchains._

- [Dos.Network](https://dos.network/) - _DOS Network is a decentralized oracle service network to boost blockchain usability with real-world data and computation power._
