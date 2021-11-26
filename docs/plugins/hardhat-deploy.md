---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/wighawag/hardhat-deploy/tree/master)
:::

<h1> hardhat-deploy</h1>

_A [Hardhat](https://hardhat.org) Plugin For Replicable Deployments And Easy Testing_

- [What is it for ?](#what-is-it-for-)
- [hardhat-deploy in a nutshell](#hardhat-deploy-in-a-nutshell)
- [Installation](#installation)
  - [npm install hardhat-deploy](#npm-install-hardhat-deploy)
  - [TypeScript support](#typescript-support)
  - [Migrating existing deployment to hardhat-deploy](#migrating-existing-deployment-to-hardhat-deploy)
- [Hardhat Tasks Available/Updated](#hardhat-tasks-availableupdated)
  - [1. hardhat deploy](#1-hardhat-deploy)
    - [**Options**](#options)
    - [**Flags**](#flags)
  - [2. hardhat node](#2-hardhat-node)
    - [**Options**](#options-1)
    - [**Flags**](#flags-1)
  - [3. hardhat test](#3-hardhat-test)
  - [4. hardhat etherscan-verify](#4-hardhat-etherscan-verify)
  - [5. hardhat sourcify](#5-hardhat-sourcify)
    - [**Options**](#options-2)
  - [6. hardhat export](#6-hardhat-export)
    - [**Options**](#options-3)
- [Hardhat Environment Extensions](#hardhat-environment-extensions)
- [Configuration](#configuration)
  - [**1. namedAccounts (ability to name addresses)**](#1-namedaccounts-ability-to-name-addresses)
  - [**2. extra hardhat.config networks' options**](#2-extra-hardhatconfig-networks-options)
  - [**3. extra hardhat.config paths' options**](#3-extra-hardhatconfig-paths-options)
  - [Importing deployment from other projects (with truffle support)](#importing-deployment-from-other-projects-with-truffle-support)
  - [Access to Artifacts (non-deployed contract code and abi)](#access-to-artifacts-non-deployed-contract-code-and-abi)
- [How to Deploy Contracts](#how-to-deploy-contracts)
  - [The `deploy` Task](#the-deploy-task)
  - [Deploy Scripts](#deploy-scripts)
  - [The `deployments` field](#the-deployments-field)
    - [`deployments.deploy`](#deploymentsdeploy)
- [Handling contract using libraries](#handling-contract-using-libraries)
- [Exporting Deployments](#exporting-deployments)
- [Deploying and Upgrading Proxies](#deploying-and-upgrading-proxies)
- [Testing Deployed Contracts](#testing-deployed-contracts)
  - [Creating Fixtures](#creating-fixtures)
- [More Information On Hardhat Tasks](#more-information-on-hardhat-tasks)
  - [**1. node task**](#1-node-task)
  - [**2. test task**](#2-test-task)
  - [**3. run task**](#3-run-task)
  - [**4. console task**](#4-console-task)
- [Deploy Scripts: Tags And Dependencies](#deploy-scripts-tags-and-dependencies)
- [Builtin-In Support For Diamonds (EIP2535)](#builtin-in-support-for-diamonds-eip2535)
- [Testing Deployed Contracts](#testing-deployed-contracts)
  - [Creating Fixtures](#creating-fixtures)
- [Deploy Scripts: Tags And Dependencies](#deploy-scripts-tags-and-dependencies)

## What is it for ?

This [hardhat](https://hardhat.dev) plugin adds a mechanism to deploy contracts to any network, keeping track of them and replicating the same environment for testing.

It also adds a mechanism to associate names to addresses, so test and deployment scripts can be reconfigured by simply changing the address a name points to, allowing different configurations per network. This also results in much clearer tests and deployment scripts (no more `accounts[0]` in your code).

This plugin contains a lot more features too, all geared toward a better developer experience :

- chain configuration export
- listing deployed contracts' addresses and their abis (useful for webapps)
- library linking at time of deployment.
- deterministic deployment across networks.
- support for specific deploy script per network (L1 vs L2 for example)
- deployment dependency system (allowing you to only deploy what is needed).
- deployment retrying (by saving pending tx): so you can feel confident when making a deployment that you can always recover.
- deployments as test fixture using `evm_snapshot` to speed up testing.
- ability to create your own test fixture that automatically benefits from `evm_snapshot`'s tests speed-up boost
- combined with [hardhat-deploy-ethers](https://github.com/wighawag/hardhat-deploy-ethers) it has the ability to get ethers contract instance by name (like `await ethers.getContract("ContractName")`).
- importing artifact from external sources (like npm packages), including truffle support.
- importing deployments from external sources (like npm packages), including truffle support.
- ability to log information in `deploy` mode only (while in test the console remains clean).
- contains helpers to read and execute transaction on deployed contract referring to them by name.
- These helpers contains options to auto mine on dev network (to speed up test deployments).
- save metadata of deployed contract so they can always be fully verified, via [sourcify](https://sourcify.dev) or [etherscan](https://etherscan.io).
- ability to submit contract source to etherscan and sourcify for verification at any time. (Because **hardhat-deploy** will save all the necessary info, it can be executed at any time.)
- support harhdat's fork feature so deployment can be accessed even when run through fork.
- named accounts are automatically impersonnated too, so you can perform tx as if you had their private.
- proxy deployment with ability to upgrade them transparently, only if code changes.
- this include support for [openzeppelin](https://openzeppelin.com) transparent proxies
- diamond deployment with facets, allowing you to focus on what the new version will be. It will generate the diamondCut necessary to reach the new state.
- watch and deploy: **hardhat-deploy** can watch both your deploy script and contract code and redeploy on changes.
- HCR (Hot Contract Replacement): the watch feature combined with proxy or diamond, gives you an experience akin to frontend Hot Module Replacement: once your contract changes, the deployment is executed and your contract retains the same address and same state, allowing you to tweak your contracts while debugging your front-end.

## hardhat-deploy in a nutshell

Before going into the details, here is a very simple summary of the basic feature of **hardhat-deploy**.

**hardhat-deploy** allows you to write [`deploy scripts`](#deploy-scripts) in the `deploy` folder. Each of these files that look as follows will be executed in turn when you execute the following task: `hardhat --network <networkName> deploy`

```js
// deploy/00_deploy_my_contract.js
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('MyContract', {
    from: deployer,
    args: ['Hello'],
    log: true,
  });
};
module.exports.tags = ['MyContract'];
```

Furthermore you can also ensure these scripts are executed in test too by calling `await deployments.fixture(['MyContract'])` in your test.
This is optimized, so if multiple tests use the same contract, the deployment will be executed once and each test will start with the exact same state.

This is a huge benefit for testing since you are not required to replicate the deployment procedure in your tests. The tag feature (as seen in the script above) and [dependencies](#deploy-scripts-tags-and-dependencies) will also make your life easier when writing complex deployment procedures.

You can even group deploy scripts in different sub folder and ensure they are executed in their logical order.

Furthermore hardhat-deploy can also support a multi-chain settings like L1, L2 with multiple deploy folder specific to each network.

There is a tutorial covering the basics here : https://github.com/wighawag/tutorial-hardhat-deploy

## Installation

### npm install hardhat-deploy

```bash
npm install -D hardhat-deploy
```

And add the following statement to your `hardhat.config.js`:

```js
require('hardhat-deploy');
```

if you use `ethers.js` we recommend you also install `hardhat-deploy-ethers` which add extra features to access deployments as ethers contract.

Since `hardhat-deploy-ethers` is a fork of `@nomiclabs/hardhat-ethers` and that other plugin might have an hardcoded dependency on `@nomiclabs/hardhat-ethers` the best way to install `hardhat-deploy-ethers` and ensure compatibility is the following:

```bash
npm install --save-dev  @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers
```

Which means you then need to do `require("@nomiclabs/hardhat-ethers")` instead of `require("hardhat-deploy-ethers")` in your `hardhat.config.js` file.

More details on `hardhat-deploy-ethers` repo : https://github.com/wighawag/hardhat-deploy-ethers#readme

### TypeScript support

With hardhat the tsconfig.json is optional.

But if you add folders to the `include` field in `tsconfig.json`, you ll also need to include `hardhat.config.ts` like :

`include": ["./hardhat.config.ts", "./scripts", "./deploy", "./test"]`

for deploy script (see below) you can write them this way to benefit from typing :

```ts
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // code here
};
export default func;
```

See a template that uses **hardhat-deploy** here : https://github.com/wighawag/template-ethereum-contracts

This repo has also some examples branch that exemplify specific features, like the forking testing here : https://github.com/wighawag/template-ethereum-contracts/tree/examples/fork-test

### Migrating existing deployment to hardhat-deploy

(Only needed for existing project that already deployed contracts and has the deployment information available **(at minimum, address and abi)**)

You might want to switch your current deployment process to use **hardhat-deploy**. In that case you probably have some deployments saved elsewhere.

In order to port them to **hardhat-deploy**, you'll need to create one `.json` file per contract in the `deployments/<network>` folder (configurable via [paths config](#extra-paths-config)).

The network folder is simply the hardhat network name (as configured in hardhat.config.js) (accessible at runtime via `hre.network.name`).
Such folder need to have a file named `.chainId` containing the chainId as decimal.

For example for network named "rinkeby" (for the corresponding network) the file `deployments/rinkeby/.chainId` would be

```
4
```

Note, prior to hardhat 0.6 the chainId was appended to the folder name (expect for some known network name). This has changed and upgrading to 0.6 will require you to change the folder name and add the '.chainId' file.

Each contract file must follow this type (as defined in [types.ts](types.ts)) :

```ts
export interface Deployment {
  address: Address;
  abi: ABI;
  receipt?: Receipt;
  transactionHash?: string;
  history?: Deployment[];
  implementation?: string;
  args?: any[];
  linkedData?: any;
  solcInputHash?: string;
  metadata?: string;
  bytecode?: string;
  deployedBytecode?: string;
  libraries?: Libraries;
  userdoc?: any;
  devdoc?: any;
  methodIdentifiers?: any;
  diamondCut?: FacetCut[];
  facets?: Facet[];
  storageLayout?: any;
  gasEstimates?: any;
}
```

As you can see, only abi and address are mandatory. But having the other fields allow more feature. For example, metadata and args allow you to benefit from contract code verification.

For Receipt, the following type is expected:

```ts
export type Receipt = {
  from: string;
  transactionHash: string;
  blockHash: string;
  blockNumber: number;
  transactionIndex: number;
  cumulativeGasUsed: string;
  gasUsed: string;
  contractAddress?: string;
  to?: string;
  logs?: Log[];
  events?: any[];
  logsBloom?: string;
  byzantium?: boolean;
  status?: number;
  confirmations?: number;
};
```

Here is an example:

Let sey you have:

- 2 Contract named Greeter and Registry deployed on rinkeby
- 1 contract named Greeter on mainnet
- 2 Contract named Greeter and Registry deployed on a network named rinkeby2

You would get the following folder structure:

```
deployments/
  mainnet/
    .chainId
    Greeter.json
  rinkeby/
    .chainId
    Greeter.json
    Registry.json
  rinkeby2/
    .chainId
    Greeter.json
    Registry.json
```

The reason why **hardhat-deploy** save chainId in the `.chainId` file is both for

- safety: so that if you were to change the network name to point to a different chain, it would not attempt to read the wrong folder and assume that a contract has been deployed while it has not.
- ability to know the chainId without requring to be connected to a node (and so not dependent on hardhat.config.js settings). Useful for `export` task.

---

## Hardhat Tasks Available/Updated

hardhat deploy add several task to hardhat. It also modify existing one, adding new options and new behavior. All of these are described here:

---

### 1. hardhat deploy

---

This plugin adds the _deploy_ task to Hardhat.

This task will execute the scripts in the `deploy` folder and save the contract deployments to disk. These deployments are supposed to be saved for example in a git repository. This way they can be accessed later. But you are free to save them elsewhere and get them back via your mechanism of choice.

With the deployment saved, it allows you to deploy a contract only if changes were made.

Deploy scripts (also called Deploy functions) can also perform aribtrary logic.

For further details on how to use it and write deploy script, see [section](#deploy-scripts) below.

#### **Options**

`--export <filepath>`: export one file that contains all contracts (address, abi + extra data) for the network being invoked. The file contains the minimal information so to not bloat your frontend.

`--export-all <filepath>`: export one file that contains all contracts across all saved deployments, regardless of the network being invoked.

`--tags <tags>`: only excute deploy scripts with the given tags (separated by commas) and their dependencies (see more info [here](#deploy-scripts-tags-and-dependencies) about tags and dependencies)

`--gasprice <gasprice>`: specify the gasprice (in wei) to use by default for transactions executed via **hardhat-deploy** helpers in deploy scripts

`--write <boolean>`: default to true (except for hardhat network). If true, write deployments to disk (in deployments path, see [path config](#extra-paths-config)).

#### **Flags**

`--reset`: This flag resets the deployments from scratch. Previously deployed contract are not considered and deleted from disk.

`--silent`: This flag remove **hardhat-deploy** log output (see log function and log options for [`hre.deployments`](#the-deployments-field))

`--watch`: This flag make the task never ending, watching for file changes in the deploy scripts folder and the contract source folder. If any changes happen the contracts are recompiled and the deploy script are re-run. Combined with a proxy deployment ([Proxies](#deploying-and-upgrading-proxies) or [Diamond](#builtin-in-support-for-diamonds-eip2535)) this allow to have HCR (Hot Contract Replacement).

---

### 2. hardhat node

---

This plugin modify the _node_ task so that it also execute the deployment script before exposing the server http RPC interface

It add similar options than the `deploy` task :

#### **Options**

`--export <filepath>`: export one file that contains all contracts (address, abi + extra data) for the network being invoked. The file contains the minimal information so to not bloat your frontend.

`--export-all <filepath>`: export one file that contains all contracts across all saved deployment, regardless of the network being invoked.

`--tags <tags>`: only excute deploy scripts with the given tags (separated by commas) and their dependencies (see more info [here](#deploy-scripts-tags-and-dependencies) about tags and dependencies)

`--gasprice <gasprice>`: specify the gasprice to use by default for transactions executed via **hardhat-deploy** helpers in deploy scripts

`--write <boolean>`: default to true (except for hardhat network). If true, write deployments to disk (in deployments path, see [path config](#extra-paths-config)).

`--forkDeployments <networkName>`: defaults to `localhost`; this option allows you to specify the network to fetch the deployment from when running in fork mode. This is necessary as hardhat fork feature does not track the fork's network: <https://github.com/nomiclabs/hardhat/issues/1164>

`--asNetwork <networkName`: default to `localhost` (or the value specified by `--forkDeployments` if any), this option allows you to specify the network name to be used for **hardhat-deploy** functionality, like which folder the resulting deployment should be saved to.

#### **Flags**

`--noReset`: This flag prevent the reseting of the existing deployments. This is usually not desired when running the `node` task as a network is created from scratch and previous deployemnt are irrelevant.

`--show-accounts`: this flag will output the account private keys

`--silent`: This flag remove **hardhat-deploy** log output (see log function and log options for [`hre.deployments`](#the-deployments-field))

`--watch`: This flag make the task never ending, watching for file changes in the deploy scripts folder and the contract source folder. If any changes happen the contracts are recompiled and the deploy script are re-run. Combined with a proxy deployment ([Proxies](#deploying-and-upgrading-proxies) or [Diamond](#builtin-in-support-for-diamonds-eip2535)) this allow to have HCR (Hot Contract Replacement).

`--no-deploy` that discard all other options to revert to normal `hardhat node` behavior without any deployment being performed.

Note that the deployments are saved as if the network name is `localhost`. This is because `hardhat node` is expected to be used as localhost: You can for example execute `hardhat --network localhost console` after `node` is running. Doing `builder --network hardhat console` would indeed not do anything useful. It still take the configuration from `hardhat` in the hardhat.config.js file though.

---

### 3. hardhat test

---

This plugin adds a flag argument `--deploy-fixture` to the _test_ task that runs the global deployments fixture before the tests and snapshots it. This will generaly speed up the tests.

---

### 4. hardhat etherscan-verify

---

This plugin adds the _etherscan-verify_ task to Hardhat.

This task will submit the contract source and other info of all deployed contracts to allow etherscan to verify and record the sources.

Instead of using the full solc input, this task will first attempt to send the minimal sources from the metadata.
But Etherscan sometime fails due to a bug in solidity compiler (<https://github.com/ethereum/solidity/issues/9573>). As such this task can fallback on full solc input (see option --solc-input). Note that if your contract was deployed with a previous version of **hardhat-deploy**, it might not contains the full information. The issue seems to be fully resolved since solc version 0.8.

This task will also attempt to automatically find the SPDX license in the source.

To execute that task, you need to specifiy the network to run against :

```bash
hardhat --network mainnet etherscan-verify --api-key <apikey>
```

#### **Options**

`--api-key <api key>`: let you specify your etherscan api key. Alternatively, you can provide it via the env variable `ETHERSCAN_API_KEY`

`--license <SPDX license id>`: SPDX license (useful if SPDX is not listed in the sources), need to be supported by etherscan: https://etherscan.io/contract-license-types

`--force-license`: if set, will force the use of the license specified by --license option, ignoring the one in the source (useful for license not supported by etherscan)

`--solc-input`: fallback on solc-input id needed (useful when etherscan fails on the minimum sources, see https://github.com/ethereum/solidity/issues/9573)

`--sleep`: sleep 500ms between each verification, so API rate limit is not exceeded

---

### 5. hardhat sourcify

---

This plugin adds the _sourcify_ task to Hardhat.

Similar to `hardhat etherscan-verify` this task will submit the contract source and other info of all deployed contracts to sourcify.

```bash
hardhat --network mainnet sourcify
```

Later this task might instead pin the metadata to ipfs, so sourcify can automatically verify them.

#### **Options**

`--endpoint <endpoint>`: specify the sourcify endpoint, default to https://sourcify.dev/server/

`--write-failing-metadata`: if set and the sourcify task fails to verify, the metadata file will be written to disk, so you can more easily figure out what has gone wrong.

---

### 6. hardhat export

---

This plugin adds the _export_ task to Hardhat.

This task will export the contract deployed (saved in `deployments` folder) to a file with a simple format containing only contract addresses and abi, useful for web apps.

One of the following options need to be set for this task to have any effects :

#### **Options**

`--export <filepath>`: export one file that contains all contracts (address, abi + extra data) for the network being invoked. The file contains the minimal information so to not bloat your frontend.

`--export-all <filepath>`: export one file that contains all contracts across all saved deployment, regardless of the network being invoked.
This last option has some limitations, when combined with the use of external deployments (see [Configuration](#configuration)). If such external deployments were using older version of **hardhat-deploy** or truffle, the chainId might be missing. In order for these to be exported, the hardhat network config need to explicity state the chainId in the `networks` config of `hardhat.config.js`.

---

---

## Hardhat Environment Extensions

This plugin extends the Hardhat Runtime Environment by adding 4 fields:

- `getNamedAccounts: () => Promise<{ [name: string]: string }>`: a function returning an object whose keys are names and values are addresses. It is parsed from the `namedAccounts` configuration (see [Configuration](#configuration)).

- `getUnnamedAccounts: () => Promise<string[]}>`: accounts which has no names, useful for test where you want to be sure that the account is not one of the predefined one

- `deployments`: contains functions to access past deployments or to save new ones, as well as helpers functions.

- `getChainId(): Promise<string>`: offer an easy way to fetch the current chainId.

---

---

## Configuration

---

### **1. namedAccounts (ability to name addresses)**

---

This plugin extends the `HardhatConfig`'s object with an optional `namedAccounts` field.

`namedAccounts` allows you to associate names to addresses and have them configured per chain.
This allows you to have meaningful names in your tests while the addresses match to multi sig in real network for example.

```js
{
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
            4: '0xA296a3d5F026953e17F472B497eC29a5631FB51B', // but for rinkeby it will be a specific address
            "goerli": '0x84b9514E013710b9dD0811c9Fe46b837a4A0d8E0', //it can also specify a specific netwotk name (specified in hardhat.config.js)
        },
        feeCollector:{
            default: 1, // here this will by default take the second account as feeCollector (so in the test this will be a different account than the deployer)
            1: '0xa5610E1f289DbDe94F3428A9df22E8B518f65751', // on the mainnet the feeCollector could be a multi sig
            4: '0xa250ac77360d4e837a13628bC828a2aDf7BabfB3', // on rinkeby it could be another account
        }
    }
}
```

<!-- You can also specify addresses with the `ledger://` prefix. In which case the account fetched will still be the corresponding address, but behind the scene, the transaction will be created via the hardware waller. Currently the feature is not working very well though and better support is needed. -->

---

### **2. extra hardhat.config networks' options**

---

**hardhat-deploy** add 4 new fields to `networks` configuration

`live` : this is not used internally but is useful to perform action on a network whether it is a live network (rinkeby, mainnet, etc) or a temporary one (localhost, hardhat). The default is true (except for localhost and hardhat where the default is false).

`saveDeployments`: this tell whether **hardhat-deploy** should save the deployments to disk or not. Default to true, except for the hardhat network.

`tags`: network can have tags to represent them. The config is an array and at runtime the hre.network.tags is an object whose fields (the tags) are set to true.

This is useful to conidtionaly operate on network based on their use case.

Example:

```js
{
  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["local"]
    },
    hardhat: {
      live: false,
      saveDeployments: true,
      tags: ["test", "local"]
    },
    rinkeby: {
      live: true,
      saveDeployments: true,
      tags: ["staging"]
    }
  }
}
```

`deploy`: the deploy field override the paths.deploy option and let you define a set of folder containing the deploy scripts to be executed for this network.

You can thus have one network that will be executing L1 deployment and other L2 deployments, etc...

---

### **3. extra hardhat.config paths' options**

---

It also adds fields to `HardhatConfig`'s `ProjectPaths` object.

Here is an example showing the default values :

```js
{
    paths: {
        deploy: 'deploy',
        deployments: 'deployments',
        imports: 'imports'
    }
}
```

The deploy folder is expected to contains the deploy script that are executed upon invocation of `hardhat deploy` or `hardhat node`.
It can also be an array of folder path.

The deployment folder will contains the resulting deployments (contract addresses along their abi, bytecode, metadata...). One folder per network and one file per contract.

The imports folder is expected to contains artifacts that were pre-compiled. Useful if you want to upgrade to a new solidity version but want to keep using previously compiled contracts. The artifact is the same format as normal hardhat artifact, so you can easily copy them over, before switching to a new compiler version.

---

### Importing deployment from other projects (with truffle support)

It also add the `external` field to `HardhatConfig`

Such fiels allows to specify paths for external artifacts or deployments.

The external object has 2 fields:

```js
{
    external: {
        contracts: [
          {
            artifacts: "node_modules/@cartesi/arbitration/export/artifacts",
            deploy: "node_modules/@cartesi/arbitration/export/deploy"
          },
          {
            artifacts: "node_modules/someotherpackage/artifacts",
          }
        ],
        deployments: {
          rinkeby: ["node_modules/@cartesi/arbitration/build/contracts"],
        },
    }
}
```

The contract field specify an array of object which itself have 2 fields.

- artifacts: (mandatory) it is a path to an artifact folder. This support both hardhat and truffle artifacts.
- deploy: (optional) it specifies a path to a folder where reside deploy script. The deploy script have only access to the artifact specified in the artifacts field. This allow project to share their deployment procedure. A boon for developer aiming at integrating it as they can get the contracts to be deployed for testing locally.

The deployments fields specify an object whose field name are the hardhat network and the value is an array of path to look for deployments. It supports both **hardhat-deploy** and truffle formats.

---

### Access to Artifacts (non-deployed contract code and abi)

you can access contract artifact via `getArtifact` function :

```js
const {deployments} = require('hardhat');
const artifact = await deployments.getArtifact(artifactName);
```

With the `hardhat-deploy-ethers` plugin you can get your ethers contract via :

```js
const {deployments, ethers} = require('hardhat');
const factory = await ethers.getContractFactory(artifactName);
```

Note that the artifact file need to be either in `artifacts` folder that hardhat generate on compilation or in the `imports` folder where you can store contracts compiled elsewhere. They can also be present in the folder specified in `external.artifacts` see [Importing deployment from other projects](#importing-deployment-from-other-projects-truffle-support-too)

---

---

## How to Deploy Contracts

---

### The `deploy` Task

`hardhat --network <networkName> deploy [options and flags]`

This is a new task that the plugin adds. As the name suggests it deploys contracts.
To be exact it will look for files in the folder `deploy` or whatever was configured in `paths.deploy`, see [paths config](#extra-paths-config)

It will scan for files in alphabetical order and execute them in turn.

- it will `require` each of these files and execute the exported function with the HRE as argument

Note that running `hardhat deploy` without specifying a network will use the default network. If the default network is hardhat (the default's default) then nothing will happen as a result but this can be used to ensure the deployment is without issues.

To specified the network, you can use the builtin hardhat argument `--network <network name>` or set the env variable `HARDHAT_NETWORK`

---

### Deploy Scripts

The deploy scripts need to be of the following type :

```js
export interface DeployFunction {
  (env: HardhatRuntimeEnvironment): Promise<void | boolean>;
  skip?: (env: HardhatRuntimeEnvironment) => Promise<boolean>;
  tags?: string[];
  dependencies?: string[];
  runAtTheEnd?: boolean;
  id?: string;
}
```

The skip function can be used to skip executing the script under whatever condition. It simply need to resolve a promise to true.

The tags is a list of string that when the _deploy_ task is executed with, the script will be executed (unless it skips). In other word if the deploy task is executed with a tag that does not belong to that script, that script will not be executed unless it is a dependency of a script that does get executed.

The dependencies is a list of tag that will be executed if that script is executed. So if the script is executed, every script whose tag match any of the dependency will be executed first.

The `runAtTheEnd` is a boolean that if set to true, will queue that script to be executed after all other scripts are executed.

These set of fields allow more flexibility to organize the scripts. You are not limited to alphabetical order.

Finally the function can return true if it wishes to never be executed again. This can be usfeul to emulate migration scripts that are meant to be executed only once. Once such script return true (async), the `id` field is used so to track execution and if that field is not present when the script return true, it will fails.

In any case, as a general advice every deploy function should be idempotent. This is so they can always recover from failure or pending transaction.

This is why the `hre.deployments.deploy` function will by default only deploy if the contract code has changed, making it easier to write idempotent script.

An example of a deploy script :

```js
module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId,
  getUnnamedAccounts,
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // the following will only deploy "GenericMetaTxProcessor" if the contract was never deployed or if the code changed since last deployment
  await deploy('GenericMetaTxProcessor', {
    from: deployer,
    gasLimit: 4000000,
    args: [],
  });
};
```

As you can see the HRE passed in has 4 new fields :

- `getNamedAccounts` is a function that returns a promise to an object whose keys are names and values are addresses. It is parsed from the `namedAccounts` configuration (see [`namedAccounts`](#namedaccounts)).

- `getUnnamedAccounts`: function that return a promise to an array of accounts (which were not used in `getNamedAccounts`), useful for test where you want to be sure that the account is not one of the predefined one

- `deployments`, which contains functions to access past deployments or to save new ones, as well as helpers functions.

- `getChainId` which return a promise for the chainId

The deploynments field contains the `deploy` function taht allow you to deploy contract and save them. It contains a lot more functions though :

---

### The `deployments` field

The deployments field contains several helpers function to deploy contract but also execute transaction.

```ts
export interface DeploymentsExtension {
  deploy(name: string, options: DeployOptions): Promise<DeployResult>; // deploy a contract
  diamond: {
    // deploy diamond based contract (see section below)
    deploy(name: string, options: DiamondOptions): Promise<DeployResult>;
  };
  deterministic( // return the determinsitic address as well as a function to deploy the contract, can pass the `salt` field in the option to use different salt
    name: string,
    options: Create2DeployOptions
  ): Promise<{
    address: Address;
    deploy(): Promise<DeployResult>;
  }>;
  fetchIfDifferent( // return true if new compiled code is different than deployed contract
    name: string,
    options: DeployOptions
  ): Promise<{differences: boolean; address?: string}>;
  save(name: string, deployment: DeploymentSubmission): Promise<void>; // low level save of deployment
  get(name: string): Promise<Deployment>; // fetch a deployment by name, throw if not existing
  getOrNull(name: string): Promise<Deployment | null>; // fetch deployment by name, return null if not existing
  getDeploymentsFromAddress(address: string): Promise<Deployment[]>;
  all(): Promise<{[name: string]: Deployment}>; // return all deployments
  getArtifact(name: string): Promise<Artifact>; // return a hardhat artifact (compiled contract without deployment)
  getExtendedArtifact(name: string): Promise<ExtendedArtifact>; // return a extended artifact (with more info) (compiled contract without deployment)
  run( // execute deployment scripts
    tags?: string | string[],
    options?: {
      resetMemory?: boolean;
      deletePreviousDeployments?: boolean;
      writeDeploymentsToFiles?: boolean;
      export?: string;
      exportAll?: string;
    }
  ): Promise<{[name: string]: Deployment}>;
  fixture( // execute deployment as fixture for test // use evm_snapshot to revert back
    tags?: string | string[],
    options?: {fallbackToGlobal?: boolean; keepExistingDeployments?: boolean}
  ): Promise<{[name: string]: Deployment}>;
  createFixture<T, O>( // execute a function as fixture using evm_snaphost to revert back each time
    func: FixtureFunc<T, O>,
    id?: string
  ): (options?: O) => Promise<T>;
  log(...args: any[]): void; // log data only ig log enabled (disabled in test fixture)

  execute( // execute function call on contract
    name: string,
    options: TxOptions,
    methodName: string,
    ...args: any[]
  ): Promise<Receipt>;
  rawTx(tx: SimpleTx): Promise<Receipt>; // execute a simple transaction
  catchUnknownSigner( // you can wrap other function with this function and it will catch failure due to missing signer with the details of the tx to be executed
    action: Promise<any> | (() => Promise<any>),
    options?: {log?: boolean}
  ): Promise<null | {
    from: string;
    to?: string;
    value?: string;
    data?: string;
  }>;
  read( // make a read-only call to a contract
    name: string,
    options: CallOptions,
    methodName: string,
    ...args: any[]
  ): Promise<any>;
  read(name: string, methodName: string, ...args: any[]): Promise<any>;
  // rawCall(to: Address, data: string): Promise<any>; // TODO ?
}
```

---

#### `deployments.deploy`

---

The deploy function as mentioned allow you to deploy a contract and save it under a specific name.

The deploy function expect 2 parameters: one for the name and one for the options

See below the full list of fields that the option parameter allows and requires:

```ts
export interface DeployOptions = {
  from: string; // address (or private key) that will perform the transaction. you can use `getNamedAccounts` to retrived the address you want by name.
  contract?: // this is an optional field. If not specified it defaults to the contract with the same name as the first parameter
    | string // this field can be either a string for the name of the contract
    | { // or abi and bytecode
        abi: ABI;
        bytecode: string;
        deployedBytecode?: string;
      };
  args?: any[]; // the list of argument for the constructor (or the upgrade function in case of proxy)
  skipIfAlreadyDeployed?: boolean; // if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
  log?: boolean; // if true, it will log the result of the deployment (tx hash, address and gas used)
  linkedData?: any; // This allow to associate any JSON data to the deployment. Useful for merkle tree data for example
  libraries?: { [libraryName: string]: Address }; // This let you associate libraries to the deployed contract
  proxy?: boolean | string | ProxyOptions; // This options allow to consider your contract as a proxy (see below for more details)

  // here some common tx options :
  gasLimit?: string | number | BigNumber;
  gasPrice?: string | BigNumber;
  value?: string | BigNumber;
  nonce?: string | number | BigNumber;

  estimatedGasLimit?: string | number | BigNumber; // to speed up the estimation, it is possible to provide an upper gasLimit
  estimateGasExtra?: string | number | BigNumber; // this option allow you to add a gas buffer on top of the estimation

  autoMine?: boolean; // this force a evm_mine to be executed. this is useful to speed deployment on test network that allow to specify a block delay (ganache for example). This option basically skip the delay by force mining.
  deterministicDeployment? boolean | string; // if true, it will deploy the contract at a deterministic address based on bytecode and constuctor arguments. The address will be the same across all network. It use create2 opcode for that, if it is a string, the string will be used as the salt.
};
```

---

---

## Handling contract using libraries

In the deploy function, one of the `DeployOptions` that can be passed into the function is the `libraries` field.

First, deploy the library using the `deploy` function, then when we deploy a contract that needs the the linked library, we can pass the deployed library name and address in as an argument to the `libraries` object.

```js
const exampleLibrary = await deploy("ExampleLibary", {
    from: <deployer>
});

```

ExampleLibrary is now deployed to whatever network is in the context of the environment.

For example, if we are deploying on Rinkeby, this library will get deployed on rinkeby, and the `exampleLibrary` variable will be a deployment object that contains the abi as well as the deployed address for the contract.

Now that the library is deployed, we can link it in our next deployed contract.

```js
const example = await deploy("Example", {
    from: <deployer>
    args: ["This is an example string argument in the constructor for the 'Example' contract"],
    libraries: {
        ExampleLibrary: exampleLibrary.address
    }
});

```

This `libraries` object takes the name of the library, and its deployed address on the network. Multiple libraries can be passed into the `libraries` object.

---

---

## Exporting Deployments

Apart from deployments saved in the `deployments` folder which contains all information available about the contract (compile time data + deployment data), `hardhat-deploy` allows you to export lightweight files.

These can be used for example to power your frontend with contract's address and abi.

This come into 2 flavors.

The first one is exported via the `--export <file>` option and follow the following format :

```js
export interface Export {
  chainId: string;
  name: string;
  contracts: {[name: string]: ContractExport};
}
```

where name is the name of the network configuration chosen (see hardhat option `--network`)

The second one is exported via the `--export-all <file>` option and follow the following format :

```js
export type MultiExport = {
  [chainId: string]: {[name: string]: Export},
};
```

As you see the second format include the previous. While in most case you'll need the single export where your application will support only one network, there are case where your app would want to support multiple network at nonce. This second format allow for that.

Furthermore as hardhat support multiple network configuration for the same network (rinkeby, mainnet...), the export-all format will contains each of them grouped by their chainId.

---

---

## Deploying and Upgrading Proxies

As mentioned above, the deploy function can also deploy a contract through a proxy. It can be done without modification of the contract as long as it does not have a constructor (or constructor with zero arguments).

The default Proxy is both ERC-1967 and ERC-173 Compliant, but other proxy can be specified, like openzeppelin transparent proxies.

Code for the default Proxy can be found [here](solc_0.7/proxy/EIP173Proxy.sol)

To perform such proxy deployment, you just need to invoke the deploy function with the following options : `{..., proxy: true}`

See example :

```js
module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('Greeter', {
    from: deployer,
    proxy: true,
  });
};
```

You can also set it to `proxy: "<upgradeMethodName>"` in which case the function `<upgradeMethodName>` will be executed upon upgrade.
the `args` field will be then used for that function instead of the contructor. It is also possible to then have a constructor with the same arguments and have the proxy be disabled. It can be useful if you want to have your contract as upgradeable in a test network but be non-upgradeable on the mainnet.

See example :

```js
module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('Greeter', {
    from: deployer,
    proxy: 'postUpgrade',
    args: ['arg1', 2, 3],
  });
};
```

The proxy option can also be an object which can set the specific owner that the proxy is going to be managed by.

See example:

```js
module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
  const {deploy} = deployments;
  const {deployer, greeterOwner} = await getNamedAccounts();
  await deploy('Greeter', {
    from: deployer,
    proxy: {
      owner: greeterOwner,
      methodName: 'postUpgrade',
    },
    args: ['arg1', 2, 3],
  });
};
```

Note that for the second invokation, this deployment will fails to upgrade the proxy as the `from` which is `deployer` is not the same as the proxy's owner : `greeterOwner`

To make it work, you have to create a new script that have for `from` field: `greeterOwner`. If such value is a a multi sig or an address not registered as part of hardhat signers, the tx will not be executed but instead an error will be throw. That error can be caught up via deployments.catchUnknwonSigner function so you get the necessary tx details to execute it elsewhere.

The full proxy options is as follow:

```ts
export interface ProxyOptions {
  owner?: Address; // this set the owner of the proxy. further upgrade will need to be executed from that owner
  methodName?: string; // method to be executed when the implementation is modified.
  proxyContract?: string | ArtifactData; // default to "EIP173Proxy". See below for more details
  viaAdminContract?: // allow to specify a contract that act as a middle man to perform upgrades. Useful and Recommended for Transparent Proxies
  | string
    | {
        name: string;
        artifact?: string | ArtifactData;
      };
}
```

The `proxyContract` field allow you to specify your own Proxy contract. If it is a string, it will first attemp to get an artifact with that name. If not found it will fallback on the following if

it matches:

- `EIP173Proxy`: use the default Proxy that is EIP-173 compliant

- `EIP173ProxyWithReceive`: Same as above except that the proxy contains a receive hook to accept empty ETH payment

- `OpenZeppelinTransparentProxy`: Use Openzeppelin Transparent Proxy (slightly modified as openzeppelin's one hardcode the msg.sender as first owner, see code [here](solc_0.7\openzeppelin\proxy\TransparentUpgradeableProxy.sol))
  When this option is chosen, the `DefaultProxyAdmin` is also used as admin since Transparent Proxy kind of need an intermediarry contract for administration. This can be configired via the `viaAdminContract` option

- `OptimizedTransparentProxy`: This contract is similar to above, except that it is optimized to not require storage read for the admin on every call.

## Builtin-In Support For Diamonds (EIP2535)

The deployments field also expose the diamond field: `hre.deployments.diamond` that let you deploy [Diamonds](https://eips.ethereum.org/EIPS/eip-2535) in an easy way.

Instead of specifying the facets to cut out or cut in, which the diamond contract expects, you specify the facets you want to end up having on the deployed contract.

`diamond.deploy` expect the facet as names. The names represent contract to be deployed as facet. In future version you ll be able to specify deployed contract or artifact object as facet.

To deploy a contract with 3 facet you can do as follow :

```js
module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
  const {diamond} = deployments;
  const {deployer, diamondAdmin} = await getNamedAccounts();
  await diamond.deploy('ADiamondContract', {
    from: deployer,
    owner: diamondAdmin,
    facets: ['Facet1', 'Facet2', 'Facet3'],
  });
};
```

if you then later execute the following script:

```js
module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
  const {diamond} = deployments;
  const {deployer, diamondAdmin} = await getNamedAccounts();
  await diamond.deploy('ADiamondContract', {
    from: diamondAdmin, // this need to be the diamondAdmin for upgrade
    owner: diamondAdmin,
    facets: ['NewFacet', 'Facet2', 'Facet3'],
  });
};
```

Then the NewFacet will be deployed automatically if needed and then the diamondCut will cut Facet1 out and add NewFacet.

Note that if the code for Facet2 and Facet3 changes, they will also be redeployed automatically and the diamondCuts will replace the existing facets with these new ones.

Note that The Diamond contract's code is part of hardhat-deploy and contains 3 built-in facet that can be removed manually if desired.
These facets are used for ownership, diamondCut and diamond loupe.

The implementation is the [reference implementation by Nick Mudge](https://github.com/mudgen/diamond-3)

Like normal proxies you can also execute a function at the time of an upgrade.

This is done by specifying the execute field in the diamond deploy options :

```js
diamond.deploy('ADiamondContract', {
  from: deployer,
  owner: diamondAdmin,
  facets: ['NewFacet', 'Facet2', 'Facet3'],
  execute: {
    methodName: 'postUpgrade',
    args: ['one', 2, '0x3'],
  },
});
```

Since the diamond standard has no builtin mechanism to make the deployment of Diamond with function execution, the Diamond when deployed is actually deployed through a special contract, the `Diamantaire` (see code [here](solc_0.7/diamond/Diamantaire.sol)) that act as factory to build Diamond. It uses deterministic deployment for that so, it is transparently managed by hardhat-deploy. It also embed the implementation of the builtin facet, removing the need to have different instances of each live.

<!-- The Diamantaire also support the deterministic deployment of Diamonds.
An extra field can be passed to the Diamond deployment options : `deterministicSalt`. It has to be a non-zero 32bytes string (in hex format).
Note that if you want to deploy 2 diamonds with same owner, you'll need 2 different deterministicSalt for them to be 2 separate contracts. -->

## Testing Deployed Contracts

You can continue using the usual test task :

`hardhat test`

Tests can then use the `hre.deployments.fixture` function to run the deployment for the test and snapshot it so that tests don't need to perform all the deployments transaction every time, they simply reuse the snapshot for every test (this leverages `evm_snapshot` and `evm_revert` provided by both `hardhat` and `ganache`). You can for example set them in a `beaforeEach`.

Here is an example of a test :

```js
const {deployments} = require('hardhat');

describe('Token', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });
  it('testing 1 2 3', async function () {
    const Token = await deployments.get('Token'); // Token is available because the fixture was executed
    console.log(Token.address);
    const ERC721BidSale = await deployments.get('ERC721BidSale');
    console.log({ERC721BidSale});
  });
});
```

If the deployment scripts are complex, the first test could take while (as the fixture need to execute the deployment) but then from the second test onward, the deployments are never re-executed, instead the fixture will do `evm_revert` and test will run far faster.

Tests can also leverage named accounts for clearer test. Combined with `hardhat-deploy-ethers` plugin, you can write succint test :

```js
const {ethers, getNamedAccounts} = require('hardhat');

describe('Token', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });
  it('testing 1 2 3', async function () {
    const {tokenOwner} = await getNamedAccounts();
    const TokenContract = await ethers.getContract('Token', tokenOwner);
    await TokenContract.mint(2).then((tx) => tx.wait());
  });
});
```

---

### Creating Fixtures

Furthermore, tests can easily create efficient fixture using `deployments.createFixture`

See example :

```js
const setupTest = deployments.createFixture(async ({deployments, getNamedAccounts, ethers}, options) => {
  await deployments.fixture(); // ensure you start from a fresh deployments
  const { tokenOwner } = await getNamedAccounts();
  const TokenContract = await ethers.getContract("Token", tokenOwner);
  await TokenContract.mint(10).then(tx => tx.wait()); //this mint is executed once and then `createFixture` will ensure it is snapshotted
  return {
    tokenOwner: {
      address: tokenOwner,
      TokenContract
    }
  };
};
describe("Token", () => {
  it("testing 1 2 3", async function() {
    const {tokenOwner} = await setupTest()
    await tokenOwner.TokenContract.mint(2);
  });
});
```

While this example is trivial, some fixture can requires several transaction and the ability to snapshot them automatically speed up the tests greatly.

---

---

## More Information On Hardhat Tasks

---

### **1. node task**

as mentioned above, the node task is slighly modified and augmented with various flags and options

`hardhat node`

In particulat it adds an argument `--export` that allows you to specify a destination file where the info about the contracts deployed is written.
Your webapp can then access all contracts information.

---

### **2. test task**

`hardhat test`

the test task is augmented with one flag argument `--deploy-fixture` that allows to run all deployments in a fixture snapshot before executing the tests. This can speed up the tests that use specific tags as the global fixture take precedence (unless specified).

In other word tests can use `deployments.fixture(<specific tag>)` where specific tag only deploys the minimal contracts for tests, while still benefiting from global deployment snapshot if used.

If a test needs the deployments to only include the specific deployment specified by the tag, it can use the following :

```js
deployments.fixture('<specific tag>', {fallbackToGlobal: false});
```

Due to how snapshot/revert works in hardhat, this means that these tests will not benefit from the global fixture snapshot and will have to deploy their contracts as part of the fixture call. This is automatic but means that these tests will run slower.

---

### **3. run task**

`hardhat --network <networkName> run <script>`

The run task act as before but thanks to the `hre.deployments` field it can access deployed contract :

```js
const hre = require('hardhat');
const {deployments, getNamedAccounts} = hre;

(async () => {
  console.log(await deployments.all());
  console.log({namedAccounts: await getNamedAccounts()});
})();
```

You can also run it directly from the command line as usual.

`HARDHAT_NETWORK=rinkeby node <script>` is the equivalent except it does not load the hardhat environment twice (which the run task does)

---

### **4. console task**

`hardhat console`

The same applies to the `console` task.

---

## Deploy Scripts: Tags And Dependencies

---

It is possible to execute only specific parts of the deployments with `hardhat deploy --tags <tags>`

Tags represent what the deploy script acts on. In general it will be a single string value, the name of the contract it deploys or modifies.

Then if another deploy script has such tag as a dependency, then when this latter deploy script has a specific tag and that tag is requested, the dependency will be executed first.

Here is an example of two deploy scripts :

```js
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;
  const namedAccounts = await getNamedAccounts();
  const {deployer} = namedAccounts;
  const deployResult = await deploy('Token', {
    from: deployer,
    args: ['hello', 100],
  });
  if (deployResult.newlyDeployed) {
    log(
      `contract Token deployed at ${deployResult.contract.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ['Token'];
```

```js
module.exports = async function ({getNamedAccounts, deployments}) {
  const {deployIfDifferent, log} = deployments;
  const namedAccounts = await getNamedAccounts();
  const {deployer} = namedAccounts;
  const Token = await deployments.get('Token');
  const deployResult = await deploy('Sale', {
    from: deployer,
    contract: 'ERC721BidSale',
    args: [Token.address, 1, 3600],
  });
  if (deployResult.newlyDeployed) {
    log(
      `contract Sale deployed at ${deployResult.contract.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ['Sale'];
module.exports.dependencies = ['Token']; // this ensure the Token script above is executed first, so `deployments.get('Token')` succeeds
```

As you can see the second one depends on the first. This is because the second script depends on a tag that the first script registers as using.

With that when `hardhat deploy --tags Sale` is executed

then both scripts will be run, ensuring Sale is ready.

You can also define the script to run after another script is run by setting `runAtTheEnd` to be true. For example:

```js
module.exports = async function ({getNamedAccounts, deployments}) {
  const {deployIfDifferent, execute, log} = deployments;
  const namedAccounts = await getNamedAccounts();
  const {deployer, admin} = namedAccounts;
  await execute('Sale', {from: deployer}, 'setAdmin', admin);
};
module.exports.tags = ['Sale'];
module.exports.runAtTheEnd = true;
```

Tags can also be used in test with `deployments.fixture`. This allow you to test a subset of the deploy script.
