# Ignition and git

**TODO**

Hardhat Ignition creates several files when a deployment is run. You may want to commit some or all of these files to source control.

While committing the entire `deployments` directory is the recommended approach, there are some reasons why you may want to commit only some of the files: namely, repo bloat. The `deployments` directory can grow quite large, especially if you are deploying to multiple networks. At the very least, you should commit the `deployed_addresses.json` file found within each deployment directory. This file contains the addresses of all contracts deployed by the module.

You should make sure to store the rest of the files if you want to resume a deployment later.

Future versions of Ignition will make the `deployments` file system structure lighter, and friendlier to versioning.
