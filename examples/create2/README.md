# Create2 Example for Ignition

This hardhat project is an example of using ignition to deploy contracts with a `create2` factory.

## Deploying

Currently our api isn't flexible enough to support direct cli use of `create2` factories, as we haven't yet implemented a native approach to loading bytecode. See the tests for an example of usage where we work around this constraint with async calls to read artifacts directly.

## Test

To run the hardhat tests using ignition:

```shell
npm run test:examples
```
