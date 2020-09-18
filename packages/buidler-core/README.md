# RedSpot

TODO

---------
Redspot is named after Jupiter's Great Red Spot, which is also the largest DOT in the solar system. Redspot's target project is [Truffle](https://github.com/trufflesuite/truffle)  in Truffle Suite. Redspot is a development environment, testing framework and asset pipeline for `pallet-contracts`. Redspot is trying to let the development of ink! be projectized and simplify the testing and interacting with contracts.

Currently, Redspot has release v0.1 which is used for MVP (minimum viable product) verification ([https://github.com/patractlabs/redspot](https://github.com/patractlabs/redspot)). However we think basic architecture not suit for future requirements due to substrate has a more flexible system. Thus we decide using [buidler](https://github.com/nomiclabs/buidler) as Redspot new core architecture for it has an outstanding desigin to allow developer using plugin to add new features.

Therefore, from Redspot v0.2 milestones, we migrate Redspot features from old framework to buidler core framework and modify it  a lot to suit substrate under MIT licence. From now, Redspot would build more features based on this forked buidler core. 

This project is used for contracts developer, if developers want to deploy and test on a blockchain, we advice developer to use "jupiter" blockchain, which is a open testnet for substrate pallet-contracts. Better than that, jupiter also provide a develop type node, that could very easily for testing contracts.

Please refer to this for more information: https://github.com/patractlabs/jupiter

## Installation

TODO

## Documentation

TODO
