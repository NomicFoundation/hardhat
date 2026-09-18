# Initializing the mocha and ethers template

The `mocha-ethers` template is the counterpart to the node:test and viem one: the same project, tested with mocha and talking to the network through ethers.

Initializing it and running its tests is the check that the alternative toolchain is as usable as the default.

```sh
npx --yes hardhat --init --template mocha-ethers

npx hardhat compile
npx hardhat test
```
