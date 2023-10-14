# Version control of deployments

Hardhat Ignition creates several files when a deployment is run. To understand them, please read our [Deployment artifacts](./deployments.md) guide.

If you want to version your deployments, recommended way is commiting the entire `deployments` directory.

If you think they are too large to be committed, you should at least commit their `deployed_addresses.json` file.

Note that if you don't keep track of the rest of the files, you won't be able to extend your deployment by modifying your modules or creating new ones, so consider saving somewhere else.

Future versions of Hardhat Ignition will make the `deployments` file system structure lighter, and friendlier to versioning.
