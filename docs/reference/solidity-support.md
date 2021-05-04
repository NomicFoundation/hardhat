# Solidity support

Hardhat Network has first-class Solidity support. It always knows which smart contracts are
being run, what they do exactly, and why they fail, making smart contracts development easier.

To do this kind of things, Hardhat integrates very deeply with Solidity, which means that new
versions of it aren't automatically supported.

This section of the docs explains which versions are supported, and what happens if you use
an unsupported one.

## Supported versions

These are the versions of Solidity that you can expect to fully work with Hardhat:

- Any 0.5.x version starting from 0.5.1
- Any 0.6.x version
- Any 0.7.x version

We recommend against using Hardhat with newer, unsupported versions of Solidity, but if
you need to do it, please read on.

### Using an unsupported version

When running an unsupported version of Solidity our integration with it may not work, or
do it incorrectly.

This can mean that Solidity stack traces may stop working, be incorrect, or incomplete. It
can also mean that `console.log` may stop working.

Despite those things possibly breaking, the actual compilation and execution of your smart 
contracts won't be affected. You can still trust your test results or deploy smart contracts.
You will just get less help from Hardhat when doing so.
