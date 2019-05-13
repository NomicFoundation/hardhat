# Plugins

- [@nomiclabs/buidler-truffle4](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle4): integration with TruffleContract from Truffle 4.
- [@nomiclabs/buidler-truffle5](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5): integration with TruffleContract from Truffle 5.
- [@nomiclabs/buidler-web3](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3): injects Web3 1.x into the Buidler Runtime Environment.
- [@nomiclabs/buidler-web3-legacy](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3-legacy): injects Web3 0.20.x into the Buidler Runtime Environment.
- [@nomiclabs/buidler-ethers](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ethers): injects ethers.js into the Buidler Runtime Environment.
- [@nomiclabs/buidler-solpp](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-solpp): automatically run the solpp preprocessor before each compilation.
- [@nomiclabs/buidler-solhint](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-solhint): easily run solhint to lint your Solidity code.

# Under development

These plugins are under development and we would love your help to get them to the finish line:

- [@nomiclabs/buidler-solc-docker](https://github.com/nomiclabs/buidler-docker-solc/pull/2): compile contracts using a native solc binary running inside a Docker container for faster compilation times.
- [@nomiclabs/buidler-etherscan](https://github.com/nomiclabs/buidler/pull/234): automatic Etherscan source code verification

# Plugin ideas

These are ideas for plugins that we haven't gotten around to building yet, but feel free to use them as inspiration if you want to build one:

- buidler-ganache: Automatically manage a Ganache instance for running unit tests.
- buidler-faucets: Add a few tasks to easily get testnet ETH into an address.
- buidler-ens: Makes it really easy to integrate ENS resolution into tasks. e.g. `env.ens.resolve('buidler.eth')`
- buidler-infura: Makes it easier to work with Infura nodes.
