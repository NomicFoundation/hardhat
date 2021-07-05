# Hardhat Network Reference

- It supports the following hardforks:
  - byzantium
  - constantinople
  - petersburg
  - istanbul
  - muirGlacier

## Config

- Default behavior: Hardhat will automatically run in-process when `defaultNetwork` is empty or set to `hardhat`.

## `console.log`
- You can use it in calls and transactions. It works with `view` functions, but not in `pure` ones.
- It always works, regardless of the call or transaction failing or being successful.
- To use it you need to import `hardhat/console.sol`.
- You can call `console.log` with up to 4 parameters in any order of following types:
  - `uint`
  - `string`
  - `bool`
  - `address`
- There's also the single parameter API for the types above, and additionally `bytes`, `bytes1`... up to `bytes32`:
  - `console.logInt(int i)`
  - `console.logUint(uint i)`
  - `console.logString(string memory s)`
  - `console.logBool(bool b)`
  - `console.logAddress(address a)`
  - `console.logBytes(bytes memory b)`
  - `console.logBytes1(bytes1 b)`
  - `console.logBytes2(bytes2 b)`
  - ...
  - `console.logBytes32(bytes32 b)`
- `console.log` implements the same formatting options that can be found in Node.js' [`console.log`](https://nodejs.org/dist/latest-v12.x/docs/api/console.html#console_console_log_data_args), which in turn uses [`util.format`](https://nodejs.org/dist/latest-v12.x/docs/api/util.html#util_util_format_format_args).
  - Example: `console.log("Changing owner from %s to %s", currentOwner, newOwner)`
- It works with any library: ethers.js, web3.js, waffle, truffle-contract, etc.
- `console.log` is implemented in standard Solidity and then detected in Hardhat Network. This makes its compilation work with any other tools (like Remix, Waffle or Truffle).
- `console.log` calls can run in other networks, like mainnet, kovan, ropsten, etc. They do nothing in those networks, but do spend a minimal amount of gas.
