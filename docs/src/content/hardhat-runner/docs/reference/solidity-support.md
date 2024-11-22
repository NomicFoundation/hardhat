# Solidity support

Hardhat Network has first-class Solidity support. It always knows which smart contracts are being run, what exactly they do, and why they fail, making smart contract development easier.

To do these kinds of things, Hardhat integrates very deeply with Solidity, which means that new versions of it aren't automatically supported.

This section of the docs explains which versions are supported, and what happens if you use an unsupported one.

## Supported versions

These are the versions of Solidity that you can expect to fully work with Hardhat:

- Any 0.5.x version starting from 0.5.1
- Any 0.6.x version
- Any 0.7.x version
- Any 0.8.x version up to and including 0.8.28

We recommend against using Hardhat with newer, unsupported versions of Solidity. But if you need to do so; please read on.

### Using an unsupported version

When running an unsupported version of Solidity, our integration may not work or behave incorrectly.

This could mean that Solidity stack traces stop working, are incorrect, or incomplete. It could also mean that `console.log` stops working.

Despite these features possibly being affected, the compilation and execution of your smart contracts won't be affected. You can still trust your test results and deploy smart contracts, but Hardhat may be less useful in the process.

## Support for IR-based codegen

The solc compiler has a newer, alternative way of generating bytecode through an [intermediate representation](https://docs.soliditylang.org/en/latest/ir-breaking-changes.html). This mode of compilation can be enabled with the `viaIR` setting.

At the moment, this option only works well [when the optimizer is enabled](https://github.com/ethereum/solidity/issues/12533). Since Hardhat works much better when the optimizer is disabled, we don't completely support the `viaIR` option yet. You can still enable it to compile your contracts and run your tests, but things like stack traces might not work correctly.

If you use the `viaIR` option, we recommend you set the [optimization step sequence](https://docs.soliditylang.org/en/v0.8.17/yul.html#optimization-step-sequence) to `"u"`, to make Hardhat work as well as possible:

```
solidity: {
  version: "{RECOMMENDED_SOLC_VERSION}", // any version you want
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      details: {
        yulDetails: {
          optimizerSteps: "u",
        },
      },
    },
  },
}
```
