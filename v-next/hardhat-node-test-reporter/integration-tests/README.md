# Integration tests

This folder contains integration tests for the reporter. They don't use `node:test` as driver of the test runs, as you can't run `node:test` within `node:test`.

Instead, the script `index.ts` runs all the tests in each fixture folder, comparing the reporter's results with `result.txt`.

## Running each test manually

You can run each of the fixture test manually from the package root by building it and running `node --import tsx/esm --test --test-reporter=./dist/src/reporter.js integration-tests/fixture-tests/example-test/*.ts`
