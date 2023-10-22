# Deployment artifacts

Hardhat Ignition stores the information for each of your deployments in folders inside of `./ignition/deployments`.

These folders contain all the deployment results, and a journal file which records every deployment action executed, enabling recovery from errors and resuming deployments.

The different files inside each deployment folder are detailed below:

## The journal

The main file in a deployment folder is `journal.jsonl`. This is where Hardhat Ignition writes every operation it makes, before executing it.

The journal file allows Hardhat Ignition to resume deployments.

## Contract Artifacts and `BuildInfo`s

Hardhat Ignition uses [the same format as Hardhat](../../../hardhat-runner/docs/advanced/artifacts.md) for artifacts and build info files.

The only differences are that the artifacts are stored in `ignition/deployment/<DeploymentId>/artifacts`, without subfolders, and that their files are named after the `Future` ID that created them.

As an example, a call to `m.contract` with ID `"foo"` in your module `"Mod"`, will create an artifact file `ignition/deployment/<DeploymentId>/artifacts/Mod#foo.json`.

## Contract addresses

Every deployment folder also contains a `deployed_addresses.json`, which is a JSON file mapping each successfully executed contract `Future` to its address.

This means that if you have a call to `m.contract`, `m.library`, or `m.contractAt` with ID `"foo"` in your module `"Mod"`, the `deployed_addresses.json` mapping will look like:

```json
{
  //...

  "Mod#foo": "0x..."

  //...
}
```
