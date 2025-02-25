---
prev: true
---

# Solidity Tests

Hardhat 3 introduces support for Solidity tests, alongside the existing TypeScript-based test framework. This feature wasn’t feasible in Hardhat 2 due to technical limitations, but with the architectural improvements in Hardhat 3, we’re able to deliver Solidity testing with the quality you’ve come to expect from Hardhat.

Hardhat’s Solidity testing framework is compatible with the Dapptools-style Solidity tests, refined and popularized by Foundry. With this feature, you can write unit tests, fuzz tests, and invariant tests in Solidity, and leverage many of the Foundry-inspired cheatcodes you may already know. We designed Hardhat's Solidity tests to be as similar as possible to Foundry’s, minimizing unnecessary fragmentation in the developer community.

That said, there are some key differences in how Hardhat handles Solidity tests compared to Foundry. These differences are detailed in a section below.

## How Solidity tests work in Hardhat 3

Hardhat treats Solidity files that follow specific conventions as test files. A Solidity file is considered a test file if it's under the contracts directory and has `.t.sol` as its extension, or if its under the `paths.tests.solidity` directory in Hardhat's configuration.

All contracts in a test file are considered test contracts. The functions in these contracts whose names start with `test` are considered test functions. These functions will be called by Hardhat when running the tests. If a test function reverts, the test will be considered failed.

All the debugging features of Hardhat, such as console.log debugging, Solidity stack traces, and error inference, are fully compatible with Solidity tests. This ensures you get the same comprehensive insights into your tests as you would with TypeScript-based tests.

Moreover, multichain workflows (a major feature of Hardhat 3) will eventually extend to Solidity tests, allowing you to test across multiple chain types. However, this functionality is not yet available in the alpha version.

## Differences between Hardhat and Foundry-style Solidity tests

While Hardhat and Foundry share many similarities in their Solidity testing frameworks, there are a few differences:

1. `testFail` behavior. Foundry’s testFail prefix indicates that the test passes only if the transaction reverts. In Hardhat, this is considered an anti-pattern because it is less explicit than using revert-expectation cheatcodes like vm.expectRevert. Hardhat does not support testFail by default but provides an opt-in mechanism for teams migrating legacy tests.
2. No Inline Configuration via NatSpec. Unlike Foundry, Hardhat does not support configuring tests inline using NatSpec comments. Test configuration must be handled programmatically in your test files.
3. Unsupported Scripting Cheatcodes Foundry includes cheatcodes that facilitate scripting, such as startBroadcast and stopBroadcast. These are not currently supported in Hardhat since they are beyond the scope of its testing-focused architecture.
4. No Fixture Support Foundry's fixture cheatcodes are not compatible with Hardhat’s approach to test isolation. Instead, Hardhat relies on programmatic test setup and fixtures defined in JavaScript/TypeScript.
5. Cheatcodes: getCode and getDeployedCode Foundry’s getCode and getDeployedCode cheatcodes are not supported in Hardhat because they conflict with how Hardhat handles runtime deployments and its dynamic testing environment.
