# Running tests in parallel

You can run your tests in parallel by using the `--parallel` flag:

```
$ npx hardhat test --parallel
```

Most of the time, running your tests serially or in parallel should produce the same results, but there are some scenarios where tests run in parallel will behave differently:

- In serial mode all the test files share the same instance of the [Hardhat Runtime Environment](/advanced/hardhat-runtime-environment.html), but in parallel mode this is not always the case. Mocha uses a pool of workers to execute the tests, and each worker starts with its own instance of the HRE. This means that if one test file deploys a contract, then that deployment will exist in some of the other test files and it won't in others.
- The `.only` modifier doesn't work in parallel mode. As an alternative, you can use [`--grep`](https://mochajs.org/#-grep-regexp-g-regexp) to run specific tests.
- Because parallel mode uses more system resources, the duration of individual tests might be longer, so there's a chance that some tests start timing out for that reason. If you run into this problem, you can increase the tests timeout in the [Mocha section of your Hardhat config](/config/#mocha-configuration) or using [`this.timeout()`](https://mochajs.org/#timeouts) in your tests.
- The order in which tests are executed is non-deterministic.

There are some other limitations related to parallel mode. You can read more about them in [Mocha's docs](https://mochajs.org/#parallel-tests). And if you are running into some issue when using parallel mode, you can check their [Troubleshooting parallel mode](https://mochajs.org/#troubleshooting-parallel-mode) section.
