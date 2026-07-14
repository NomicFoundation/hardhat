# Integration tests

This folder contains integration tests for the reporter. They don't use `node:test` as driver of the test runs, as you can't run `node:test` within `node:test`.

Instead, the script `index.ts` runs all the tests in each fixture folder, comparing the reporter's results with `result.$NODE_MAJOR_VERSION.txt` (or `result.txt` as a fallback if a node-specific result file does not exist).

## Running all tests

You can run all the tests by running `pnpm test:integration`.

## Running a single test

You can run a single test by running `pnpm test:integration --test-only example-test`.

## Running each test manually

You can run each of the fixture test manually from the package root by building it and running `node --import tsx/esm --test --test-reporter=./dist/src/reporter.js integration-tests/fixture-tests/example-test/*.ts`

## Re-generating the expected results

Re-generating the fixtures requires two external tools that are **not** installed by `scripts/setup.sh`, as they are only needed for this task and not for running the tests:

- [`aha`](https://github.com/theZiz/aha) — converts the reporter's ANSI-colored output into HTML. Install with `sudo apt install aha` or an equivalent.
- [`wkhtmltoimage`](https://wkhtmltopdf.org) (shipped in the `wkhtmltopdf` package) — renders that HTML into the `result.svg` snapshot. Install it from the [wkhtmltopdf releases](https://github.com/wkhtmltopdf/packaging/releases), e.g.:

  ```bash
  curl -sL https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb -o /tmp/wkhtmltox.deb
  sudo apt install -y /tmp/wkhtmltox.deb
  rm /tmp/wkhtmltox.deb
  ```

The `result.svg` files are human-review snapshots of the colored output; the automated tests only compare `result.txt`.

If you want to re-generate all the expected results, you can run the following script from the package root:

```bash
bash scripts/regenerate-fixtures.sh
```

To re-generate only a single fixture, you can run the following script from the package root:

```bash
bash scripts/regenerate-fixtures.sh <fixture-name>
```

## `--disable-warning=DEP0205`

We run the integration tests with `--disable-warning=DEP0205` because tsx currently generates this warning:

```
DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
```

This also means that the tests need to be run with `NODE_OPTIONS="--disable-warning=DEP0205"` to avoid the warning being printed in the test output, which would make the tests fail when comparing with the expected results.

If you are using `pnpm test:integration` you don't need to do this, as it's already taken care of by the script.
