# Module execution

This section explains how Hardhat Ignition deploys your modules. You don't need to understand this to start using it, you can read the [Quick Start guide](../getting-started/index.md#quick-start) instead.

## Module loading and validation

When you run `npx hardhat ignition deploy <file>`, Hardhat Ignition will read the `<file>`, then execute its code including the call to `buildModule` that defines your module.

`buildModule` uses your module definition callback to create different futures. `buildModule` runs some initial validations that only depend on the module definition itself. If these validations pass, an Ignition Module will be created based on the futures.

Hardhat Ignition will next check the created module in the context of your project. It will perform additional validations to ensure the futures are correct with respect to your contracts (i.e the contracts you want to deploy exist, that you are passing them valid arguments, etc).

## Previous state and reconciliation

Hardhat Ignition is designed to be able to resume a previously started deployment. This is achieved by keeping a journal of the deployment execution. Before taking an action it is written to the journal. After an action produces a result, the result is written to the journal. This allows Hardhat Ignition to reconstruct its internal state by reading the journal, a technique called [write-ahead logging](https://en.wikipedia.org/wiki/Write-ahead_logging).

Note that the journal does not store your module definition, but only the actions that have been taken during the deployment.

Whenever you run a deployment, Hardhat Ignition will first check if there's an existing journal. If there is one, Hardhat Ignition will use it to reconstruct the state of the deployment on its last run. There is then a check to determine if the modules to be deployed are compatible with the deployment's state. This process is called Reconciliation.

You can think of the reconciliation process as a validation that tries to understand if the previous state is compatible with your current modules. To learn more about this process, read the [Reconciliation guide](./reconciliation.md).

If there's a journal, and the reconciliation process passes, Hardhat Ignition starts the deployment using the previous state. The next steps of the deployment process are the same whether a fresh state is used or the state of the previous run.

## Execution order and batching

Deploying a module means executing all of its futures, which in turn requires executing all of their dependencies, which may come from different modules.

To decide the right order of execution, Hardhat Ignition creates a graph of `Future` objects, including those in your module, and those in submodules. In this graph, edges represent [explicit or implicit dependencies between `Future` objects](../guides/creating-modules.md#dependencies-between--future--objects).

Using this graph, Hardhat Ignition will create different execution batches. Each batch has a set of `Future` objects that can be executed in parallel.

The first batch will contain `Future` objects that meet one of these rules:

- It has started executing in a previous run and has neither completed nor failed.
- It has no dependency.
- All of its dependencies were successfully executed in the previous run.

The successive batches will have `Future` objects whose dependencies are included in the batches preceding it. For example, batch 4 would have `Future` objects whose dependencies were executed in a previous run, or are included in the batches 1, 2 or 3.

This batching process is run before starting to execute, and the batches are not updated during the execution.

When Hardhat Ignition starts executing a batch, it will wait until all its `Future` objects are complete before executing the next batch.

## `Future` execution

Each `Future` within a batch is executed independently, so we'll focus on the execution of a single `Future`.

### Journaling

As explained above, Hardhat Ignition uses a journal to be able to recreate its internal state at any point in time. To do this, it records every action it takes.

The first message recorded into the journal indicates that Hardhat Ignition will start executing a `Future`. This message records a concrete view of your `Future`, where any `Future`, Module Parameter or account used as argument or option is replaced with their concrete value. This allows Hardhat Ignition, during the reconciliation process, to prevent the execution of an unmodified `Future` with different values (e.g. different Module Parameters).

Subsequent steps of the `Future` execution are also recorded to the journal, including both success and failure results. The only exception to this rule are failed transaction simulations; these are not recorded. See [Transaction execution](./execution.md#transaction-execution) to learn more about transaction simulations.

Hardhat Ignition will error if you try to resume the execution of a `Future` that has a failed result recorded in the journal. It will indicate that you need to [wipe the future's previous execution](../guides/error-handling.md#wiping-a-previous-execution).

### Executing the different kinds of `Future`

Hardhat Ignition knows how to execute each kind of `Future`: deploying a contract, instantiating an existing one, calling a contract, reading from one, deploying a library, sending ETH or data, or reading an event argument.

Some of these require sending transactions, which Hardhat Ignition does through the [Hardhat Runtime Environment](../../../hardhat-runner/docs/advanced/hardhat-runtime-environment.md)'s network connection.

### Transaction execution

When Hardhat Ignition needs to send a transaction it first simulates it by running `eth_call`. If this simulation fails (i.e. the `eth_call` reverts) the execution is interrupted. Read the [Error handling guide](../guides/error-handling.md) to learn how to deal with this situation.

If the simulation is successful, Hardhat Ignition will send the transaction and start monitoring its progress until it is included in a block and accumulates the [required number of confirmations](../config/index.md#requiredconfirmations) to be considered successful.

The execution of a `Future` is not considered complete until all of its transactions have the required number of confirmations. This means that if the `Future` Child depends on the `Future` Parent, Child won't start executing before every `Future` in Parent's batch has all of their transactions confirmed with the required number of confirmations.

Once a transaction is sent, Hardhat Ignition will wait for [a period of time](../config/index.md#timebeforebumpingfees) for it to confirm. If it doesn't get its first confirmation during that time, it will resend it with higher fees.

If a transaction needs to be resent more than the configured [maximum number of times](../config/index.md#maxfeebumps), Hardhat Ignition will stop resending it and will consider the execution of the `Future` to have timed out, aborting the deployment.

Finally, if the transaction gets dropped from the mempool or replaced by an unexpected transaction (e.g. sent by the user), the execution will be aborted. You will have to rerun Hardhat Ignition, which will recover from the situation automatically, though on rerun it may indicate a wait is required for unexpected transactions to fully confirm.
