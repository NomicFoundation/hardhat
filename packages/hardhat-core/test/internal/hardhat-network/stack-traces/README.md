# Stack traces tests

> ⚠️ _This explanation was written on 2023-07-04, and can be out of date or incomplete. If you think there's something wrong, or that some important part of the explanation is missing, please open an issue about it._ ⚠️

This directory contains tests related to our tracing engine. They are mainly about the generated stack traces, but they also test things like inferred errors and console logs.

These tests are written with an ad-hoc mini framework, where each test corresponds to a directory under `test-files`. Each of these directories has a `test.json` file describing the test, and Solidity files that are used by that test. The `test.ts` file then consumes these files to generate and execute the corresponding tests.

## Example

One simple example of a test is `test-files/0_8/call-message/external-calls/non-contract-account-called`. This test checks that, when a transaction makes a call to an address that is not a contract, the proper error is inferred by our heuristics and that the frame in the stack trace has the right file name, line number, contract name and function name.

```json
{
  "transactions": [
    {
      "file": "c.sol",
      "contract": "C"
    },
    {
      "to": 0,
      "function": "test",
      "stackTrace": [
        {
          "type": "NONCONTRACT_ACCOUNT_CALLED_ERROR",
          "sourceReference": {
            "contract": "C",
            "file": "c.sol",
            "function": "test",
            "line": 11
          }
        }
      ]
    }
  ]
}
```

Each `test.json` file can have several fields, but the only mandatory one is a `transactions` array with the list of transactions that should be executed. The `TestDefinition` interface in [`test.ts`](https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-core/test/internal/hardhat-network/stack-traces/test.ts) describes the possible contents of a `test.json` file.

Transactions can be deployments or calls. In this case the first transaction deploys the contract `C` in `c.sol`, and the second transaction calls the function `test` in that contract. The contract that is called is indicated by `"to": 0`, which corresponds to the first contract deployed by this test.

Each transaction can have some "assertion" fields, which describe what should happen when that transaction is executed. The most common one is `stackTrace`, which indicates that the transaction should revert and that Hardhat should generate the given stack trace. In this case, the test is saying that the transaction should revert with a single frame, which has an inferred `NONCONTRACT_ACCOUNT_CALLED_ERROR` error, and points to line 11 of the `c.sol` file.

Another possible assertion field is `consoleLogs`, which specifies that the transaction should emit certain logs with `console.sol`. See for example [this `test.json`](https://github.com/NomicFoundation/hardhat/blob/stack-traces-tests-explainer/packages/hardhat-core/test/internal/hardhat-network/stack-traces/test-files/0_8/console-logs/uint/uint/test.json).

## Directory structure

All the tests are located under the `test-files` directory. Each directory immediately under it corresponds to a minor version of Solidity. In practice this means that tests under `test-files/0_8` will have a `pragma solidity ^0.8.0`, but it is possible to specify tests that are only run for a more precise range of versions.

There are two other directories under `test-files`. One is `version-independent`, which has tests that can be run with any version of solc (right now there's only one test there). The other one is `artifacts`, which is a cache directory with all the compilation outputs from previous runs.

## Running a single test

`test.json` files can (temporarily) have a `"only": true` field, which means that only that test will be run. This is equivalent to using `it.only` in Mocha.

## How tests are executed

The `compilers-list.ts` module has a list of solc versions that can be used by these tests. By default, only the ones that have `latestSolcVersion: true` are run, but we have a [CI workflow](https://github.com/NomicFoundation/hardhat/actions/workflows/hardhat-core-ci.yml) that you can trigger manually with the `test-all-solc-versions` input set to `true` to executes the tests using all the available compilers.

These compilers are grouped by minor version (that is, a group with all the 0.5.x compilers, a group all the 0.6.x compilers and so on) and each group is used to run the tests in the corresponding directory (`test-files/0_5`, `test-files/0_6`, and so on).

The solidity files in each test directory are compiled (unless a cached compilation output exists) and then the `test.json` description is then executed.

## The `HARDHAT_TESTS_SOLC_PATH` environment variable

If this variable is set, the only compiler used will be the one that is available in that path. For example, if you want to test a nightly version, you would set the envvars `HARDHAT_TESTS_SOLC_PATH=/path/to/solc-nightly-0.8.21 HARDHAT_TESTS_SOLC_VERSION=0.8.21` and then run the tests. This would only run the test files under `test-files/0_8` and `test-files/version-independent`.
