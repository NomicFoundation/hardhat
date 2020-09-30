# Running tests with solidity-coverage

[`solidity-coverage`](https://github.com/sc-forks/solidity-coverage/blob/master/BUIDLER_README.md) is a solidity test coverage plugin available for use with Buidler.

This plugin is primarily used for its testing coverage visualization features which present the extent to which code has been covered as well as which lines, if any, were not covered by tests.

Keep in mind that running your tests with `solidity-coverage` will make them slower than if you were to run them using the built-in [Buidler EVM](../buidler-evm/README.md) network

## Using the `solidity-coverage` plugin

This plugin adds a task to Buidler called `coverage` that runs the tests in the `test/` directory with `solidity-coverage`.

### Download and Installation

To get started, you first need to install `solidity-coverage` with `npm` by running this command:

```
npm install --save-dev solidity-coverage
```

This command adds `solidity-coverage` as a plugin available to use with your local Buidler installation.

### Configuration

Next up, you need to make sure that Buidler knows to include `solidity-coverage` as an available plugin. 

To do this, add this line to your `buidler.config.js`:

```js
usePlugin("solidity-coverage");

module.exports = {
  networks: {
    coverage: {
      url: 'http://localhost:8555'
    }
  },
}
```

This code also tells Buidler where it should run the network that `solidity-coverage` will generate.


### Usage

Now that you have the `solidity-coverage` plugin installed and configured, you can use it to run tests and display a testing coverage breakdown for your project!

In order to do this, you just need to run this command in the working directory of your project:

```
npx buidler coverage
```

This will compile all of the code in your project, run the tests in your `test/` directory, and present a table of test coverage results for each of the files in your project. This command also displays stack traces for any errors in code compilation as well as any test failures that occurred while it ran.

### Example

Using the `sample-test.js` in the `test` folder generated when you start Buidler, we can test the similarly generated `Greeter.sol` file.

The below is the output of running the sample tests with `solidity-coverage`.

```
$ npx buidler coverage

> server:            http://127.0.0.1:8555
> ganache-core:      v2.10.1
> solidity-coverage: v0.7.10

Network Info
============
> port:    8555
> network: soliditycoverage


Instrumenting for coverage...
=============================

> Greeter.sol
Compiling...
Compiled 2 contracts successfully
All contracts have already been compiled, skipping compilation.


  Greeter
    √ Should return the new greeting once it's changed (761ms)


  1 passing (769ms)

--------------|----------|----------|----------|----------|----------------|
File          |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
--------------|----------|----------|----------|----------|----------------|
 contracts\   |      100 |      100 |      100 |      100 |                |
  Greeter.sol |      100 |      100 |      100 |      100 |                |
--------------|----------|----------|----------|----------|----------------|
All files     |      100 |      100 |      100 |      100 |                |
--------------|----------|----------|----------|----------|----------------|

> Istanbul reports written to ./coverage/ and ./coverage.json
> solidity-coverage cleaning up, shutting down ganache server
```

That is the output displayed if the tests run successfully and fully cover `Greeter.sol`. If the tests didn't fully cover the file, the output provides information on what lines and portions of the file weren't covered.

Below is the output of running the sample tests with `solidity-coverage`, but with this line in `sample-test.js`:

```
expect(await greeter.greet()).to.equal("Hello, world!");
```

changed to:

```
expect(await greeter.greet()).to.equal("Hello, humans!");
```

so that the test will fail.

```
$ npx buidler coverage

> server:            http://127.0.0.1:8555
> ganache-core:      v2.10.1
> solidity-coverage: v0.7.10

Network Info
============
> port:    8555
> network: soliditycoverage


Instrumenting for coverage...
=============================

> Greeter.sol
Compiling...
Compiled 2 contracts successfully
All contracts have already been compiled, skipping compilation.


  Greeter
    1) Should return the new greeting once it's changed


  0 passing (709ms)
  1 failing

  1) Greeter
       Should return the new greeting once it's changed:

      AssertionError: expected 'Hello, world!' to equal 'Hello, humans!'
      + expected - actual

      -Hello, world!
      +Hello, humans!

      at Context.<anonymous> (test\sample-test.js:9:38)
      at processTicksAndRejections (internal/process/task_queues.js:97:5)



--------------|----------|----------|----------|----------|----------------|
File          |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
--------------|----------|----------|----------|----------|----------------|
 contracts\   |       60 |      100 |    66.67 |       60 |                |
  Greeter.sol |       60 |      100 |    66.67 |       60 |          20,21 |
--------------|----------|----------|----------|----------|----------------|
All files     |       60 |      100 |    66.67 |       60 |                |
--------------|----------|----------|----------|----------|----------------|

> Istanbul reports written to ./coverage/ and ./coverage.json
> solidity-coverage cleaning up, shutting down ganache server
An unexpected error occurred:

Error: ❌ 1 test(s) failed under coverage.
    at SimpleTaskDefinition.action (C:\node_modules\solidity-coverage\plugins\buidler.plugin.js:146:37)
    at processTicksAndRejections (internal/process/task_queues.js:97:5)
    at Environment._runTaskDefinition (C:\node_modules\@nomiclabs\buidler\src\internal\core\runtime-environment.ts:203:14)
    at main (C:\node_modules\@nomiclabs\buidler\src\internal\cli\cli.ts:157:5)
```

As you can see, `solidity-coverage` reports the percentages of the respective parts of `Greeter.sol` that were covered as well as the specific lines in the file that were not for easy debugging.

It also, like Buidler, includes a stack trace detailing how the test that failed did so.

---
**Further Configuration**

If you would like to run test files that are outside of the `test/` directory or customize the configuration of the `solidity-coverage` plugin, check out the more in-depth documentation [here](https://buidler.dev/plugins/solidity-coverage.html).

---