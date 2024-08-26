# Integration tests

This folder contains integration tests for the reporter. They don't use `node:test` as driver of the test runs, as you can't run `node:test` within `node:test`.

Instead, the script `index.ts` runs all the tests in each fixture folder, comparing the reporter's results with `result.txt`.

## Running all tests

You can run all the tests by running `npm run test:integration`.

## Running a single test

You can run a single test by running `npm run test:integration --test-only example-test`.

## Running each test manually

You can run each of the fixture test manually from the package root by building it and running `node --import tsx/esm --test --test-reporter=./dist/src/reporter.js integration-tests/fixture-tests/example-test/*.ts`

## Re-generating the expected results

If you want to re-generate all the expected results, you can run the following script from the package root:

```bash
for dir in integration-tests/fixture-tests/*; do
  node --import tsx/esm --test --test-reporter=./dist/src/reporter.js $dir/*.ts --color > $dir/result.txt
done
```
