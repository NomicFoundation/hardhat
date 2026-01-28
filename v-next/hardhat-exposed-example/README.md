# hardhat-exposed-example

A Hardhat plugin that generates exposed contract wrappers, allowing you to test internal functions in your Solidity contracts.

## What it does

When testing Solidity contracts, internal functions are not directly accessible from test code. This plugin automatically generates wrapper contracts that inherit from your original contracts, exposing internal functions so they can be called in tests.

For a contract like:

```solidity
contract MyContract {
    function _internalHelper(uint256 x) internal pure returns (uint256) {
        return x * 2;
    }
}
```

The plugin generates:

```solidity
import "../contracts/MyContract.sol";

contract MyContractExposed is MyContract {
  function internalHelper(uint256 x) internal pure returns (uint256) {
      return _internalHelper(x);
  }
}
```

You can then deploy `MyContractExposed` in your tests and call the internal function through inheritance.

## Installation

```bash
npm install hardhat-exposed-example
```

## Usage

Import the plugin in your Hardhat config and add it to the `plugins` array:

```typescript
import HardhatExposedExample from "hardhat-exposed-example";

export default {
  plugins: [
    // ... other plugins ...,
    HardhatExposedExample,
  ],
};
```

The plugin hooks into the Solidity build process and automatically generates exposed contracts for all your Solidity files.

## Configuration

You can configure the output directory for generated contracts:

```typescript
// hardhat.config.ts
export default {
  paths: {
    exposedContracts: "exposed-contracts", // default
  },
};
```

The path can be relative (resolved from project root) or absolute.

## Clean Behavior

When running `npx hardhat clean`, this plugin automatically deletes the `exposedContracts` directory along with all generated wrapper contracts.

This ensures that stale exposed contracts are removed when you clean your project. The directory will be regenerated on the next build.

## How it works

1. During the Solidity build, the plugin detects all contract definitions
2. For each contract (excluding npm libraries), it generates a wrapper contract
3. The wrapper inherits from the original contract, making internal functions accessible (TODO: the current generation is super basic)
4. Generated files are placed in the configured `exposedContracts` directory
5. The exposed contracts are compiled separately from your main contracts, but during the same build process
6. All the cache system and ts bindings generations still works for the exposed contracts.
