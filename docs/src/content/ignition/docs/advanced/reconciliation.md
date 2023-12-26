# Reconciliation

Being able to resume the deployment of a module is a key feature of Hardhat Ignition. Resuming is used to [recover from errors](../guides/error-handling.md), and to allow you to [continue the deployment of modified modules](../guides/modifications.md).

As explained in the [Module execution](./execution.md) guide, Hardhat Ignition can resume a previous deployment thanks to its journal, which is used to reconstruct the internal state of the previous deployment run.

This previous state may have been created with a different version of your modules or contracts though. Hardhat Ignition runs a process called Reconciliation to understand if the previous state is compatible with your current modules and contracts.

If the reconciliation process fails, Hardhat Ignition won't let you resume the deployment, and will indicate which `Future` objects have incompatible changes.

## Compatible changes

There are different changes that you can apply to your module that will pass the reconciliation process.

You can always define a new `Future` in an existing module, including importing from submodules.

You can also alter your modules so that they express the same outcomes that you already deployed, but in a different way. For example, if you had this module

```js
const param = m.getParameter("param");
const foo = m.contract("Foo", [param]);
```

and deployed it with `5` as the value of `param`, you can modify it like this and it will be compatible

```js
const foo = m.contract("Foo", [5]);
```

You can delete `Future` objects from modules as long as they haven't been executed yet. You can also delete a `Future` if it has been successfully executed, though Hardhat Ignition will print a warning when the modified module is deployed.

You can also modify the dependencies of a `Future` as long as it hasn't started executing, or if the dependencies have already been successfully executed.

Finally, you can modify the contracts used by `Future` objects that have already started executing. Hardhat Ignition will consider the changes compatible as long as their compilation bytecode is the same, except for their metadata hash, which can be different.

## Recovering from incompatible changes

There are three ways to recover from incompatible changes:

1. Revert the change.
2. Apply a new change so that your module matches what you have already deployed in a different way, as explained above.
3. Delete the previous execution of a `Future`, as explained [here](../guides/error-handling.md#wiping-a-previous-execution).
