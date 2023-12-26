# Version control of deployments

Hardhat Ignition creates files for each deployment. The files are stored under the directory `./ignition/deployments/<DeploymentId>`. To understand the files created, please read our [Deployment artifacts](./deployment-artifacts.md) guide.

If you want to store your deployments in version control, the recommended way is commiting the entire `./ignition/deployments` directory.

If you think they are too large to be committed, you should at least commit their `deployed_addresses.json` file.

Note that if you don't keep track of the rest of the files, you won't be able to extend your executed deployment by modifying your modules, so consider storing them somewhere else.

Future versions of Hardhat Ignition will make the `deployments` file system structure lighter and friendlier for version control.
