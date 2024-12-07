# Handling errors

There are many reasons that can lead to a failure when operating a smart contract. Hardhat Ignition uses different approaches for error handling depending on the error type. This guide explains these methods thoroughly.

## Contract errors

When interacting with a smart contract, there are always some chances that it might fail and revert. Hardhat Ignition handles these situations using two strategies.

When it comes to catching errors and reverts, Hardhat Ignition starts by running a simulation of every transaction. If this simulation doesn't succeed, the execution stops. All you need to do to continue your deployment in this case is rerunning Hardhat Ignition. If the simulation failure persists, you might want to consider [deleting a previous execution](#wiping-a-previous-execution) from the journal, and trying again.

While simulations catch most errors, sometimes a transaction simulation can be successful, and the contract execution still reverts. Hardhat Ignition won't send a new transaction automatically in those cases. Instead, you need to [wipe the previous execution](#wiping-a-previous-execution) and rerun the deployment.

### Wiping a previous execution

Hardhat Ignition uses a journal to record every execution step it performs, as well as the results of each of them. This allows it to resume a previous execution when needed. As soon as a `Future` starts its execution, it will be recorded into the journal.

If your deployment is failing due to a `Future`, and you need to change its definition to fix it, you will need to wipe the `Future` object's previous execution from the journal, since its definition changed. You can use the `ignition wipe` task for this, by providing it with a deployment ID **and** a future ID.

```sh
npx hardhat ignition wipe deploymentId futureId
```

## Network-related errors

Hardhat Ignition tries its best to be robust in the face of network-related errors. It manages tricky situations like resending transactions that need updated gas prices, or when nonces don't match between Hardhat Ignition and the network.

However, sometimes Hardhat Ignition might face an error it can't manage. If this happens, you can just run the same command again to pick up where you left off with your deployment.
