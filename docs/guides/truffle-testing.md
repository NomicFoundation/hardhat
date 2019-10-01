# Testing with Web3.js & Truffle

Buidler allows you to use Truffle to test your smart contracts. This mainly means compatibility with the [`@truffle/contract`](https://www.npmjs.com/package/@truffle/contract) package to interact with your smart contracts. 

Truffle 4 and Truffle 5 are supported using the `@nomiclabs/buidler-truffle4` and `@nomiclabs/buidler-truffle5` plugins respectively. Both work with either Solidity 4 or 5.

Let's see how to do this using the Buidler sample project.
Run these to start:
```
mkdir my-project
cd my-project
npm init --yes
npm install --save-dev @nomiclabs/buidler
```

Now run `npx buidler` inside your project folder and create a sample project. This is what the file structure should look like once you're done:

```
$ ls -l
total 296
drwxr-xr-x  378 fzeoli  staff   12096 Aug  7 16:12 node_modules/
drwxr-xr-x    3 fzeoli  staff      96 Aug  8 15:04 scripts/
drwxr-xr-x    3 fzeoli  staff      96 Aug  8 15:04 test/
drwxr-xr-x    3 fzeoli  staff      96 Aug  8 15:04 contracts/
-rw-r--r--    1 fzeoli  staff     195 Aug  8 15:04 buidler.config.js
-rw-r--r--    1 fzeoli  staff  139778 Aug  7 16:12 package-lock.json
-rw-r--r--    1 fzeoli  staff     294 Aug  7 16:12 package.json
```
Look at the `buidler.config.js` file and you'll see that the Truffle 5 plugin is enabled:

<<< @/../packages/buidler-core/sample-project/buidler.config.js{1}

Look at the file `test/sample-test.js` and you'll find these sample tests:

<<< @/../packages/buidler-core/sample-project/test/sample-test.js{1}

As you can see in the highlighted line, the `artifacts` object is present in the global scope and you can use it to access the Truffle contract abstractions.

These examples show two approaches towards testing: 
- Using `contract()`, which is the traditional way to test with Truffle
- Using `describe()`, which is the traditional way to test using Mocha

Truffle runs its tests with Mocha, but a few tools that integrate Mocha don't expect `contract()` and don't always work well. We recommend using the `describe()` approach.

You can run these tests by running `npx buidler test`:
```
$ npx buidler test
All contracts have already been compiled, skipping compilation.


Contract: Greeter
    ✓ Should return the new greeting once it's changed (265ms)

  Greeter contract
    Deployment
      ✓ Should deploy with the right greeting (114ms)


  2 passing (398ms)
```

If you want to use Truffle Migrations to initialize your tests and call `deployed()` on the contract abstractions, both `@nomiclabs/buidler-truffle4` and `@nomiclabs/buidler-truffle5` offer a fixtures feature to make this possible. Take a look at the [Truffle migration guide](./truffle-migration.md) to learn more.

## Using Web3.js

To use Web3.js in your tests, an instance of it is available in the global scope. You can see this in the `describe()` test in `sample-test.js`:

<<< @/../packages/buidler-core/sample-project/test/sample-test.js{20}

Checkout the plugin's [README file](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5) for more information about it.


[Buidler Runtime Environment]: /documentation/#buidler-runtime-environment-bre

