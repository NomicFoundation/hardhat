# CLI commands

The Hardhat Ignition CLI provides a set of commands to interact with the deployment process. The following is a list of available commands:

- [`deploy`](#deploy): Deploy a module to the specified network
- [`deployments`](#deployments): List all deployment IDs
- [`status`](#status): Show the current status of a deployment
- [`transactions`](#transactions): Show all transactions for a given deployment
- [`verify`](#verify): Verify contracts from a deployment against the configured block explorers
- [`visualize`](#visualize): Visualize a module as an HTML report
- [`wipe`](#wipe): Reset a deployment's future to allow rerunning

## `deploy`

Deploy a module to the specified network

```
Usage: hardhat [GLOBAL OPTIONS] ignition deploy [--default-sender <STRING>] [--deployment-id <STRING>] [--parameters <STRING>] [--reset] [--strategy <STRING>] [--verify] [--write-localhost-deployment] modulePath

OPTIONS:

  --default-sender            	Set the default sender for the deployment
  --deployment-id             	Set the id of the deployment
  --parameters                	A relative path to a JSON file to use for the module parameters
  --reset                     	Wipes the existing deployment state before deploying
  --strategy                  	Set the deployment strategy to use (default: "basic")
  --verify                    	Verify the deployment on Etherscan
  --write-localhost-deployment	Write deployment information to disk when deploying to the in-memory network

POSITIONAL ARGUMENTS:

  modulePath	The path to the module file to deploy
```

## `deployments`

List all deployment IDs

```
Usage: hardhat [GLOBAL OPTIONS] ignition deployments
```

## `status`

Show the current status of a deployment

```
Usage: hardhat [GLOBAL OPTIONS] ignition status deploymentId

POSITIONAL ARGUMENTS:

  deploymentId	The id of the deployment to show
```

## `transactions`

Show all transactions for a given deployment

```
Usage: hardhat [GLOBAL OPTIONS] ignition transactions deploymentId

POSITIONAL ARGUMENTS:

  deploymentId	The id of the deployment to show transactions for
```

## `verify`

Verify contracts from a deployment against the configured block explorers

```
Usage: hardhat [GLOBAL OPTIONS] ignition verify [--include-unrelated-contracts] deploymentId

OPTIONS:

  --include-unrelated-contracts	Include all compiled contracts in the verification

POSITIONAL ARGUMENTS:

  deploymentId	The id of the deployment to verify
```

## `visualize`

Visualize a module as an HTML report

```
Usage: hardhat [GLOBAL OPTIONS] ignition visualize [--no-open] modulePath

OPTIONS:

  --no-open	Disables opening report in browser

POSITIONAL ARGUMENTS:

  modulePath	The path to the module file to visualize
```

## `wipe`

Reset a deployment's future to allow rerunning

```
Usage: hardhat [GLOBAL OPTIONS] ignition wipe deploymentId futureId

POSITIONAL ARGUMENTS:

  deploymentId	The id of the deployment with the future to wipe
  futureId    	The id of the future to wipe
```
