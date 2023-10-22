# Visualizing your module

Hardhat Ignition adds a `visualize` task, that will generate an HTML report showing the module and its execution order.

The `visualize` task takes one argument, the path to the module to visualize. For example

```bash
npx hardhat ignition visualize ./ignition/modules/Apollo.js
```

Running `visualize` will generate the report based on the given module and it will then open it in your system's default browser.

The report summarises the contracts that will be deployed and the contract calls that will be made.

It shows the dependency graph as it will be executed by Hardhat Ignition (where a dependency will not be run until all its dependents have successfully completed).

If something in your deployment isn't behaving the way you expected, the `visualize` task can be an extremely helpful tool for debugging and verifying that your and Hardhat Ignition's understanding of the deployment are the same.

Here's [an example of how a module deploying ENS would look like](/static/ignition-visualize-example.html).
