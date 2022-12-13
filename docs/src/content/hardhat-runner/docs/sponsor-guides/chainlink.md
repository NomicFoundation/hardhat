---
title: Oracles
description: Oracles help get real-world data into your Ethereum application because smart contracts can't query real-world data on their own.
---

# Working with Chainlink oracles

_This guide is based on the [ethereum.org oracles guide](https://ethereum.org/en/developers/docs/oracles) and the [official Chainlink documentation](https://docs.chain.link/)._

Chainlink expands the capabilities of smart contracts by enabling access to real-world data and off-chain computation while maintaining the security and reliability guarantees inherent to blockchain technology.

## What is an oracle

Oracles provide a bridge between the real-world and on-chain smart contracts by being a source of data that smart contracts can rely on, and act upon.

Oracles play a critical role in facilitating the full potential of smart contract utility. Without a reliable connection to real-world conditions, smart contracts cannot effectively serve the real-world.

Watch Patrick explain Oracles:

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/ZJfkNzyO7-U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Why are they needed?

With a blockchain like Ethereum, you need every node in the network to replay every transaction and end up with the same result, guaranteed. APIs introduce potentially variable data. If you were sending ETH based on an agreed $USD value using a price API, the query would return a different result from one day to the next. Not to mention, the API could be hacked or deprecated. If this happens, the nodes in the network wouldn't be able to agree on Ethereum's current state, effectively breaking [consensus](https://ethereum.org/developers/docs/consensus-mechanisms/).

Oracles solve this problem by posting the data on the blockchain. So any node replaying the transaction will use the same immutable data that's posted for all to see. To do this, an oracle is typically made up of a smart contract and some off-chain components that can query APIs, then periodically send transactions to update the smart contract's data.

### The oracle problem

As we mentioned, blockchain transactions cannot access off-chain data directly. At the same time, relying on a single source of truth to provide data is insecure and invalidates the decentralization of a smart contract. This is known as the oracle problem.

We can avoid the oracle problem by using a decentralized oracle that pulls from multiple data sources; if one data source is hacked or fails, the smart contract will still function as intended.

### Security

An oracle is only as secure as its data source(s). If a dapp uses Uniswap as an oracle for its ETH/DAI price feed, an attacker can move the price on Uniswap to manipulate the dapp's understanding of the current price. An example of how to combat this is [a feed system](https://developer.makerdao.com/feeds/) like the one used by MakerDAO, which collates price data from many external price feeds instead of just relying on a single source.

### Architecture

This is an example of a simple Oracle architecture, but there are more ways than this to trigger off-chain computation.

1. Emit a log with your [smart contract event](https://ethereum.org/developers/docs/smart-contracts/anatomy/#events-and-logs)
2. An off-chain service has subscribed (usually using something like the JSON-RPC `eth_subscribe` command) to these specific logs.
3. The off-chain service proceeds to do some tasks as defined by the log.
4. The off-chain service responds with the data requested in a secondary transaction to the smart contract.

This is how to get data in a 1 to 1 manner, however to improve security you may want to decentralize how you collect your off-chain data.

The next step might be to have a network of these nodes making these calls to different APIs and sources, and aggregating the data on-chain.

[Chainlink Off-Chain Reporting](https://blog.chain.link/off-chain-reporting-live-on-mainnet/) (Chainlink OCR) has improved on this methodology by having the off-chain oracle network communicate with each other, cryptographically sign their responses, aggregate their responses off-chain, and send only one transaction on-chain with the result. This way, less gas is spent, but you still get the guarantee of decentralized data since every node has signed their part of the transaction, making it unchangeable by the node sending the transaction. The escalation policy kicks in if the node doesn't transact, and the next node sends the transaction.

## Getting Price Data

Chainlink Data Feeds are the quickest way to connect your smart contracts to the real-world data such as asset prices, reserve balances, and L2 sequencer health. To consume price data, your smart contract should reference AggregatorV3Interface, which defines the external functions implemented by Data Feeds.

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
        (
            /*uint80 roundID*/,
            int price,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();
        return price;
    }
}

```

## Randomness

Randomness in computer systems, especially on blockchains, is challenging to achieve because general-purpose blockchains like Ethereum do not have inherent randomness. Another problem is the public nature of blockchain technology which makes finding a secure source of entropy difficult. Almost any mechanism of generating on-chain randomness using Solidity is vulnerable to MEV attacks. 

Chainlink VRF (Verifiable Random Function) is a provably-fair and verifiable source of randomness designed for smart contracts. Smart contract developers can use Chainlink VRF as a tamper-proof random number generation (RNG) to build reliable smart contracts for any applications which rely on unpredictable outcomes:

- Blockchain games and NFTs
- Random assignment of duties and resources (e.g. randomly assigning judges to cases)
- Choosing a representative sample for consensus mechanisms

Random numbers are difficult because blockchains are deterministic.

To start with Chainlink VRF, create a new subscription on the Goerli testnet at [Subscription Manager](https://vrf.chain.link).

Click Create Subscription and follow the instructions to create a new subscription account. MetaMask opens and asks you to confirm payment to create the account on-chain. After you approve the transaction, the network confirms the creation of your subscription account on-chain.

After the subscription is created, click Add funds and follow the instructions to fund your subscription. For this example, a balance of 2 LINK is sufficient. MetaMask opens to confirm the LINK transfer to your subscription. After you approve the transaction, the network confirms the transfer of your LINK token to your subscription account.

After you add funds, click Add consumer. A page opens with your account details and subscription ID. Record your subscription ID, which you need for your consuming contract. You will add the consuming contract to your subscription later.

```solidity
// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity ^0.8.7;

import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/ConfirmedOwner.sol';

/**
 * Request testnet LINK and ETH here: https://faucets.chain.link/
 * Find information on LINK Token Contracts and get the latest ETH and LINK faucets here: https://docs.chain.link/docs/link-token-contracts/
 */

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */

contract VRFv2Consumer is VRFConsumerBaseV2, ConfirmedOwner {
    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);

    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public s_requests; /* requestId --> requestStatus */
    VRFCoordinatorV2Interface COORDINATOR;

    // Your subscription ID.
    uint64 s_subscriptionId;

    // past requests Id.
    uint256[] public requestIds;
    uint256 public lastRequestId;

    // The gas lane to use, which specifies the maximum gas price to bump to.
    // For a list of available gas lanes on each network,
    // see https://docs.chain.link/docs/vrf/v2/subscription/supported-networks/#configurations
    bytes32 keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;

    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Storing each word costs about 20,000 gas,
    // so 100,000 is a safe default for this example contract. Test and adjust
    // this limit based on the network that you select, the size of the request,
    // and the processing of the callback request in the fulfillRandomWords()
    // function.
    uint32 callbackGasLimit = 100000;

    // The default is 3, but you can set this higher.
    uint16 requestConfirmations = 3;

    // For this example, retrieve 2 random values in one request.
    // Cannot exceed VRFCoordinatorV2.MAX_NUM_WORDS.
    uint32 numWords = 2;

    /**
     * HARDCODED FOR GOERLI
     * COORDINATOR: 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D
     */
    constructor(uint64 subscriptionId)
        VRFConsumerBaseV2(0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D)
        ConfirmedOwner(msg.sender)
    {
        COORDINATOR = VRFCoordinatorV2Interface(0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D);
        s_subscriptionId = subscriptionId;
    }

    // Assumes the subscription is funded sufficiently.
    function requestRandomWords() external onlyOwner returns (uint256 requestId) {
        // Will revert if subscription is not set and funded.
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        s_requests[requestId] = RequestStatus({randomWords: new uint256[](0), exists: true, fulfilled: false});
        requestIds.push(requestId);
        lastRequestId = requestId;
        emit RequestSent(requestId, numWords);
        return requestId;
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        require(s_requests[_requestId].exists, 'request not found');
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        emit RequestFulfilled(_requestId, _randomWords);
    }

    function getRequestStatus(uint256 _requestId) external view returns (bool fulfilled, uint256[] memory randomWords) {
        require(s_requests[_requestId].exists, 'request not found');
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }
}
```
