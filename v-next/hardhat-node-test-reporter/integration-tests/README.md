# Integration tests

This folder contains integration tests for the reporter. They don't use `node:test` as driver of the test runs, as you can't run `node:test` within `node:test`.

Instead, the script `index.ts` runs all the tests in each fixture folder, comparing the reporter's results with `result.$NODE_MAJOR_VERSION.txt`.

## Running all tests

You can run all the tests by running `pnpm test:integration`.

## Running a single test

You can run a single test by running `pnpm test:integration --test-only example-test`.

## Running each test manually

You can run each of the fixture test manually from the package root by building it and running `node --import tsx/esm --test --test-reporter=./dist/src/reporter.js integration-tests/fixture-tests/example-test/*.ts`

## Re-generating the expected results

If you want to re-generate all the expected results, you can run the following script from the package root:

```bash
bash scripts/regenerate-fixtures.sh
```

To re-generate only a single fixture, you can run the following script from the package root:

```bash
bash scripts/regenerate-fixtures.sh <fixture-name>
```
