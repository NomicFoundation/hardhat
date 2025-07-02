# Hardhat's `node:test` reporter

This package includes Hardhat 3's `node:test` reporter. To integrate it with your Hardhat project, you should use the `node:test` plugin.

## Reporter style

This reporter mimics [the `Mocha`'s default `Spec` reporter](https://mochajs.org/#spec), as close as possible.

It is designed to output information about the test runs as soon as possible and in test **definition** order.

Once the test run ends, it will output global information about it, based on the diagnostics emitted by `node:test`, and any custom or unrecognized diagnostics message.

Finally, it will output the failure reasons for all the failed tests.

It introduces a number of custom features to make it more suitable for use with Hardhat.

![Demo](./demo.gif)

## Stand-alone installation

`hardhat-node-test-reporter` comes built-in with Hardhat's `node:test` plugin. You don't need to install it separately. The reporter will be used automatically.

If you want to use the reporter in your own project, you can install it with npm (optionally, with a `--save-dev` flag):

```bash
npm install --save-dev @nomicfoundation/hardhat-node-test-reporter
```

## Usage

If you want to use the reporter directly with `node`, you can do so by passing the `--test-reporter` flag:

```bash
node --test --test-reporter=@nomicfoundation/hardhat-node-test-reporter
```

## Custom features

### Slow Tests

Slow threshold is configured to 75ms. If a test case takes longer than that, it will be highlighted in red.

### Test Coverage

Test coverage is currently not supported by this reporter.

### GitHub Actions

This reporter is designed to work well with GitHub Actions. By default, it will create error annotations for failed tests. You can disable this feature by setting the `NO_GITHUB_ACTIONS_ANNOTATIONS` environment variable to `true`.

### Colour Output

This reporter will colour the output by default in terminals that support it. You can forcefully disable this feature by setting the `FORCE_COLOR` environment variable to `0` (or passing a `--no-color` flag). Similarly, you can forcefully enable this feature by setting the `FORCE_COLOR` environment variable to `1` (or passing a `--color` flag).

The behaviour is inherited from the [`chalk` package](https://github.com/chalk/chalk?tab=readme-ov-file#supportscolor).

#### Colour Legend

| Output Type | Colour       |
| ----------- | ------------ |
| Cancelled   | Gray         |
| Error       | Red          |
| Failure     | Red          |
| Skipped     | Cyan         |
| Success     | Green (tick) |
| TODO        | Blue         |

### Nesting

This reporter will indicate nesting of test suites by indenting the output at 2-space wide intervals.

### Error Formatting

This reporter will format errors in a human readable way.

It will:

- try to print the error object together with its stack trace;
- try to print the diff of the expected and actual values of the error object, if they are available;
- print internal errors of aggregated errors;
- truncate error cause stack traces after 3 levels;
- hide node internals (including test runner internals) from the stack trace;
- replace file URLs with relative paths (this should work on Windows, too).

### Diagnostics

This reporter will aggregate and output diagnostics emitted by `node:test` at the end of the test run. If it doesn't recognize a diagnostic message, it will output them as-is after the well-known diagnostics.

Well-known diagnostics are:

- `tests`
- `suites`
- `pass`
- `fail`
- `cancelled`
- `skipped`
- `todo`
- `duration_ms`
