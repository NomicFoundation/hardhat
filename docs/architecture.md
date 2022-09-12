# Deploy Architecture

Ignition expresses a deployment as a dependency graph of on-chain transactions, that is contract deployments and calls. Deployments and calls can be dependent on each other, for instance, a call to a contract requires the contract first being deployed; the call should not be invoked until the contract deploy has completed successfully.

Ignition provides the **recipe api** (a js based dsl) so users can succintly describe of a dependency graph of contract deploys and calls. The user describes the dependency graph as a `Recipe`, a utility function that takes a graph builder as its first argument.

## Deploying a Recipe

```mermaid
flowchart LR
  0[User Recipe]
  subgraph Ignition
    1[Build Recipe Graph]
    2[Validate Recipe Graph]
    3[Transform to Execution Graph]
    4[Execute]
  end
  0 --> 1
  1 --> 2
  2 --> 3
  3 --> 4
  ```

To deploy Ignition is invoked with a `Recipe`. Ignition uses the `Recipe` to build a `RecipeGraph`. This graph is then validated (i.e. are all named hardhat contracts within the hardhat project; do all the calls have the right number of arguments etc). A valid `RecipeGraph` will contain lots of **Hardhat** specific references. Ignition transforms and simplifies the `RecipeGraph` to an `ExecutionGraph`, turning **Hardhat** references into neutral ones e.g. a deploy hardhat contract `Foo` instruction, will be transformed by reading the **Hardhat** artifact for `Foo` and passing along an agnostic `Deploy this artifact` instruction.

The `ExecutionGraph` determines what is executed on-chain. Ignition's execution engine uses the vertexes of the `ExecutionGraph` to determine what transactions should be sent, and uses the edges of the `ExecutionGraph` to determine how the transactions are ordered and batched. A transaction will not be included in the next batch until all it's dependencies have successfully completed.

Either the entire graph of transactions will eventually succeed, in which case the deployment was a success. Or a transaction will fail or be stopped from completing, leading to a failed deployment.





