# Deployment artifacts

Hardhat Ignition stores all the information of your deployments in folders inside of `ignition/deployment`.

Whithin each deployment folder, Hardhat Ignition saves the deployment results, along with all the data it needs to recover from errors, resume existing deployments, and reproduce them.

This is an explanation about the different files insed each deployment folder.

## The journal

The main file in a deployment folder is `journal.jsonl`, which is were Hardhat Ignition writes every operation it takes, before executing it.

Having this file allows Hardhat Ignition resume every deployment.

## Contract Artifacts and `BuildInfo`s

Hardhat Ignition uses [the same format as Hardhat](../../../hardhat-runner/docs/advanced/artifacts.md) for artifacts and build info files.

The only differences are that all the artifacts are stored in `ignition/deployment/<id>/artifacts`, without subfolders, and that their files are named after the `Future` id that created them.

This means that if you have a call to `m.contract`, `m.library`, or `m.contractAt` with id `"foo"` in your module `"Mod"`, Hardhat Ignition will create an artifact file `ignition/deployment/<id>/artifacts/Mod#foo.json`.

## Contract addresses

Every deployment folder also has a `deployed_addresses.json`, which is a JSON mapping each successfully executed contract `Future` to its address.

This means that if you have a call to `m.contract`, `m.library`, or `m.contractAt` with id `"foo"` in your module `"Mod"`, Hardhat Ignition you will have an entry like this in `deployed_addresses.json`:

```json
{
  //...

  "Mod#foo": "0x..."

  //...
}
```
