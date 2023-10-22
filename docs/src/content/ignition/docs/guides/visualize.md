# Visualizing your module

Hardhat Ignition comes built-in with a `visualize` task that generates an HTML report, illustrating visually the module's deployment process execution. This can be helpful for debugging and verifying that your perception of your modules aligns with Hardhat Ignition's execution plan.

The `visualize` task takes the path to the module to visualize as an argument:

```bash
npx hardhat ignition visualize ./ignition/modules/Apollo.js
```

Running `visualize` will generate the report and open it in your system's default browser.

The report includes:

- A summary of the contracts that will be deployed
- A summary of the contract calls that will be made
- A dependency graph of featuring modules and `Future` objects

Check out the [visualize report of a module to deploy the ENS protocol](/static/ignition-visualize-example.html).
