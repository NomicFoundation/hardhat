# Flattening your contracts

Hardhat comes with a built-in `flatten` task that lets you combine the source code of multiple Solidity files.

## Flattening all your files

If you use the `flatten` task without passing any other arguments, all the Solidity files in your project will be combined:

```
$ npx hardhat flatten
// Sources flattened with hardhat v2.12.3 https://hardhat.org

// File contracts/Bar.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Bar {}

// File contracts/Qux.sol

...
```

The result will be printed to stdout. You can create a file with the flattened sources using the `>` redirection operator:

```
$ npx hardhat flatten > Flattened.sol

$ cat Flattened.sol
// Sources flattened with hardhat v2.12.3 https://hardhat.org

// File contracts/Bar.sol

...
```

## Flattening specific files

The `flatten` task can receive a path to the file you want to flatten:

```
npx hardhat flatten contracts/Foo.sol
```

In this case, the result will contain the source code of `Foo.sol` and all its transitive dependencies (the files that it imports, and the files that those files import, and so on).

You can also use multiple files:

```
npx hardhat flatten contracts/Foo.sol contracts/Bar.sol
```

But if `Bar.sol` is a dependency of `Foo.sol`, then the result will be the same as in the previous example.

"As explained in the previous section, you can redirect the output to a file:"

```
npx hardhat flatten contracts/Foo.sol > Flattened.sol
```

## Circular dependencies

Projects with circular dependencies cannot be flattened at the moment. If this is something you need, please upvote or comment [this issue](https://github.com/NomicFoundation/hardhat/issues/1486).
