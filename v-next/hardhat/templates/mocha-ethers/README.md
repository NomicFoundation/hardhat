# A TypeScript Hardhat project using Mocha and Ethers

> WARNING: This demonstration project is still in development. It is part of the Hardhat v3 upgrade. It is not for production use.

> NOTE: There are several plugins from the Hardhat toolbox that have not been ported to Hardhat v3 yet. In testing terms, the biggest ommision is `hardhat-chai-matchers`.

This project demonstrates basic Hardhat usecases within a TypeScript project. It comes with a minimal Hardhat configuration file and both JS/TS integration tests and Solidity Tests.

For integration testing it uses the Mocha test runner and the Ethers.js library for interacting with Ethereum nodes.

Try running the following commands to see Hardhat in action:

```shell
# Run the both the mocha integration test suite
# and the Solidity Test suite
npx hardhat3 test
```
