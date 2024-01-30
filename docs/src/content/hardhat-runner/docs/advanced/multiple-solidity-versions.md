# Multiple Solidity versions

Hardhat supports projects that use different, incompatible versions of solc. For example, if you have a project where some files use Solidity 0.5 and others use 0.6, you can configure Hardhat to use compiler versions compatible with those files like this:

```js
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.5",
      },
      {
        version: "0.6.7",
        settings: {},
      },
    ],
  },
};
```

This setup means that a file with a `pragma solidity ^0.5.0` will be compiled with solc 0.5.5 and a file with a `pragma solidity ^0.6.0` will be compiled with solc 0.6.7.

It might happen that a file can be compiled with more than one of your configured compilers, for example a file with `pragma solidity >=0.5.0`. In that case, the compatible compiler with the highest version will be used (0.6.7 in this example). If you don't want that to happen, you can specify for each file which compiler should be used by using overrides:

```js{4-7}
module.exports = {
  solidity: {
    compilers: [...],
    overrides: {
      "contracts/Foo.sol": {
        version: "0.5.5",
        settings: { }
      }
    }
  }
}
```

In this case, `contracts/Foo.sol` will be compiled with solc 0.5.5, no matter what's inside the `solidity.compilers` entry.

Keep in mind that:

- Overrides are full compiler configurations, so if you have any additional settings you're using you should set them for the override as well.
- You have to use forward slashes (`/`) even if you are on Windows.

:::tip

Hardhat also provides support for using a Custom Solidity Compiler by overriding the `TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD` subtask, learn more from the [Using a Custom Solidity Compiler guide](/guides/using-custom-solc.md).

:::
