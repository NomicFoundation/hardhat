# Handling errors

Hardhat Ignition takes different approaches to error handling depending on the kind of error its dealing with. This guide explains them in detail.

## Contract errors

Interacting with a smart contract can lead to it failing and reverting. Hardhat Ignition handles them with two different techniques.

First, before sending a transaction, Hardhat Ignition runs a simulation of it. If the simulation fails, the execution gets interrupted. All you need to do to continue your deployment in this case is rerunning Hardhat Ignition. If your simulation still fail, you can consider [deleting a previous execution](#deleting-a-previous-execution).

While simulations catch most errors, sometimes a transaction simulation can be successful, and it still reverts. In those cases Hardhat Ignition won't send a new transaction automatically. Instead, you need to [delete the previous execution](#deleting-a-previous-execution) and rerun the deployment.

### Deleting a previous execution.

Hardhat Ignition uses a journal to record everything it does, and the results of its operations. This allows it to resume a previous execution.

As soon as a `Future` starts its execution, it will be recoreded into the journal.

This means that if you need to change how a `Future` gets defined to recover from an error, you will need to delete its previous execution from the journal. You can do this by running

```sh
npx hardhat ignition wipe deploymentId futureId
```

## Network-related errors

Hardhat Ignition tries to be robust to netowrk related errors. If handles things like gas price volatility, resending transactions with updated fees, or different situations with nonces being out of sync between Hardhat Ignition and the network.

Nevertheless, there can be situations where Hardhat Ignition may not be able to handle an error. If that happens, its design allows you to continuing your deployment by simply rerunning the same command you used to start it.
