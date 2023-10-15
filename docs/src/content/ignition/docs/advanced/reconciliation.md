# Reconciliation

Being able to resume the deployment of a module is one of functionalities of Hardhat Ignition. This is used to [recover from errors](../guides/error-handling.md), and to allow you to [resume the deployment of modified modules](../guides/modifications.md).

As explained in the [Module execution](./execution.md) guide, Hardhat Ignition can resume a previous deployment thanks to its journal, which is used to reconstruct the internal state of the previous execution.

This previous state may have been created with a different version of your modules or contracts though. Hardhat Ignition runs a process called Reconciliation to understand if it's still compatible with your current modules and contracts.

If the Reconciliation process fails, Hardhat Ignition won't let you resume the deployment, and will indicate which things have changed in incompatible ways.

## Compatible changes

There are different changes that you can apply to your module that will pass the Reconciliation process.

You can always define a new `Future` to an existing module, including importing them from submodules.

You can also alter your modules so that they express the same thing that you already deployed, but in a different way. For example, if you had this module

```js
const param = m.getParameter("param");
const foo = m.contract("Foo", [param]);
```

and deployed it with `5` as the value of `param`, you can modify it like this and it will be compatible

```js
const foo = m.contract("Foo", [5]);
```

You can delete `Future`s from modules as long as they haven't been executed yet, or if they have been successfully executed. The latter will print a warning.

You can also modify the dependencies of a `Future` as long as it hasn't started executing, or if the dependencies had already been successfully executed.

Finally, you can also modify the contracts used by `Future` that have already started executing. Hardhat Ignition will consider the changes compatible as their compilation bytecode is the same, except for their metadata hash, which can be different.

## Recovering from incompatible changes

There are three ways to recover from incompatible changes.

The first one is reverting the change.

The second one is applying a new change so that your module expresses what you have already deployed in a different way, as explained above.

The last one, deleting the previous execution of a `Future`, as explained [here](../guides/error-handling.md#deleting-a-previous-execution)
