Each folder contains a different test scenario. In every folder there is:

- `Coverage.sol`: the source code that must be tested
- `Coverage.t.sol`: the tests to run against the `Coverage.sol` file
- `coverage-edr-info.ts`: the EDR coverage data generated when running the `Coverage.t.sol` tests against the `Coverage.sol` file

The EDR coverage data stored in `coverage-edr-info.ts` is used in the `coverage-manager` tests to ensure that the coverage results are as expected. This file contains both the `CoverageMetadata`, which describes all executed and non executed statements, and the `CoverageData`, which lists all the statements that were executed.
