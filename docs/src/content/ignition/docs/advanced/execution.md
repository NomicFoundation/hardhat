# Module execution

This section explains how Hardhat Ignition deploys your modules. You don't need to understand this to start using it, you can read the [Quick Start guide](../getting-started/index.md#quick-start) instead.

## Module loading and validation

When you run `npx hardhat ignition deploy <file>`, Harhdat Ignition will load the `<file>`, which in turn will execute the call to `buildModule` used to define your module.

`buildModule` will execute your module defintion callback internally, creating different `Future`s. This process will run some basic validations that only depend on the module defintion itself. If these validations pass, an Ignition Module will be created.

With the module created, Hardhat Ignition will evaluate the module in the context of your project. It will run further validations to ensure the things you want to do are correct with respect of your contracts (e.g. the contracts you want to deploy exists, and you are passing them the right amount of arguments).

## Previous state and reconciliation

Hardhat Ignition is designed to be able to resume any existing deployment. This is achieved by keeping a journal of every it does. Before taking any action it gets writteng into the journal. After an action produces a result, it gets written into the journal. This allwos Hardhat Ignition to reconstruct its internal state by reading the journal. This technique is called [write-ahead logging](https://en.wikipedia.org/wiki/Write-ahead_logging).

Note that this journal does not store your module definition, but only the actions taken by Hardhat Ignition to deploy them.

Whenever you run a deployment, Hardhat Ignition will first check if there's an existing journal. If there is one, it will load it, reconstruct the previous internal state, and then check if the modules are compatible with it through a process called Reconciliation.

You can think of the Reconciliation process as a validation that tries to understand if the previous state could have been created by deploying your current modules. To learn more about this process, read the [Reconciliation guide](./reconciliation.md).

If there's a journal, and the Reconciliation passes, Hardhat Ignition starts the deployment using the previous state, but following the same deployment process below.

## Execution order and batching

Deploying a module means executing all of its `Future`s, which in turn requires executing all of their dependencies, which may come from different modules.

To decide the right order of execution, Hardhat Ignition creates a single graph of `Future`s, including the ones of the module you are deploying, and those of any required submodule. In this graph, edges represent any [explicit or implicit dependency between `Future`s](../guides/creating-modules.md#dependencies-between-futures).

Using this graph, Hardhat Ignition will create different execution batches. Each batch has a set of `Future`s that can be executed in parallel.

The first batch will contain any `Future` that matches any of these rules:

- It has started executing in a previous run and has not completed nor failed.
- It has no dependency.
- All of its dependencies were succesfully executed in a the previous run.

The successive batches will have `Future`s whose dependencies are included in the batches preceding it. For example, batch 4 would have `Future`s whose dependencies were executed in a previous run, or are included in the batches 1, 2 or 3.

This batching process is run before starting to execute, and the batches are not updated during the execution.

Finally, when Hardhat Ignition starts executing a batch, it will wait until its complete before executing a new one.

## `Future` execution

Each `Future` within a batch is executed independently, so we'll focus on the execution of a single `Future`.

### Journaling

As explained above, Hardhat Ignition uses a journal to be able to recreate its internal state at any point in time. To do this, it records every action it takes.

The first thing that gets recorded into the journal is a message indicating that Hardhat Ignition will start executing a `Future`. This message doesn't record the `Future` as defined in your module. Instead, it records a version of it where any `Future`, Module Parameter or account used as argument or options gets replaced with their concrete values.This prevents Hardhat Ignition from resuming the execution of an unmodified `Future`, but with different values (e.g. different Module Parameters).

Every other step during the execution of the `Future` is also recorded to the jornal, including both successful and failure results. The only execption to this rule are failed transaction simulations, who don't get recorded. See the next section to learn more about this.

If you try to resume the execution of a `Future` with a failed result recorded into the journal, Hardhat Ignition will error, indicating you to [wipe its previous execution](../guides/error-handling.md#deleting-a-previous-execution).

### Executing the different kinds of `Future`

Hardhat Ignition knows how to execute each kind of `Future`: deploying a contract, instanciating an existing one, calling a contract, reading from one, deploying a library, sending ETH or data, or reading an event argument.

Some of these `Future`s require sending transactions, which Hardhat Ignition does through the [Hardhat Runtime Environment](../../../hardhat-runner/docs/advanced/hardhat-runtime-environment.md)'s network connection.

### Transaction execution

When Hardhat Ignition needs to send a transaction it first simulates it by running an `eth_call`. If this simulation fails (i.e. the `eth_call` reverts) the execution is interrupted. Read the [Error handling guide](../guides/error-handling.md) to learn how to deal with this situation.

If the simulation is successful, Hardhat Ignition will send the transaction and start monitoring its progress until it gets into a block and accoumulates the [required amount of confirmations](../config/index.md#requiredconfirmations) to be considered successful.

The execution of a `Future` is not considered complete until all of its transactions have the required amount of confirmations. This means that if a `Future` Child depends on `Future` Parent, Child won't start executing before every `Future` in Parent's batch gets all of their transactions confirmed with the required amount of confirmations.

Once a transaction is sent, Hardhat Ignition will wait for [a period of time](../config/index.md#timebeforebumpingfees) for it to confirm. If it doesn't get its first confirmation during that time, it will resend it with higher fees.

If a transaction needs to be resent more than [a maximum amount of times](../config/index.md#maxfeebumps), Hardhat Ignition will stop resending it and it will consider the execution of the `Future` to have timed out, aborting the deployment.

Finally, if the transaction gets dropped from the mempool or replaced by an unexpected transaction (e.g. sent by the user), the execution will be aborted and you would have to rerun Hardhat Ignition which it will recover from the situation automatically, after some potential wait.
