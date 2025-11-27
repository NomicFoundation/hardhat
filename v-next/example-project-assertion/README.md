# Reproduction of mocha assertion error

This is a deletable example project to reproduce an assertion error that 
can happen with a missing await. The unpredictability of cleanup in a larger
suite means this may not work for you.

To run the example:

```shell
cd v-next/example-project-assertion
pnpm hardhat test mocha

# No contracts to compile

# Running Mocha tests


#   Hardhat3 test
#     ✔ Should transfer money to another wallet with extra value (331ms)

# Unhandled promise rejection:

# HardhatError: HHE100: An internal invariant was violated: The block doesn't exist
#     at assertHardhatInvariant (/workspaces/hardhat/v-next/hardhat-errors/src/errors.ts:237:11)
#     at getBalanceChange (/workspaces/hardhat/v-next/hardhat-ethers-chai-matchers/src/internal/matchers/changeEtherBalance.ts:100:3)
#     at async Promise.all (index 0)
```

There is also a test script under `./scripts/run-test-with-cleanup.js` that tries
to recreate the issue by closing the connection - it is unsuccessful.
