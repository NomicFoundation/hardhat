# 8. Deploying to localhost

To test the contracts it's enough to start a Buidler EVM, run the test, and then stop it. But now that we are communicating with a user interface we need to simulate 
the real blockchain more faithfully by leaving the EVM running. This means we need to deploy the contract we're developing for with a script, rather than as part of a test.

Create a new directory inside the project's root directory, `scripts`, and paste this file as `scripts/deploy.js`:

```js
const contractName = "Token"

// This is a script for deploying contracts. You can adapt it to deploy yours.
const main = async () => {

  // This is just a convenience check
  if (network.name === "buidlerevm") {
    console.warn(`
You are deploying a contract to a temporary instance of the Buidler EVM network,
which is create and destroyed automatically each time.

If you want to deploy to a localhost instance use --network localhost.
`)
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying the contracts with the account: ${await deployer.getAddress()}`)
  console.log(`Account balance: ${(await deployer.getBalance()).toString()}`)

  const factory = await ethers.getContractFactory(contractName)
  const deployedContract = await factory.deploy()
  await deployedContract.deployed()

  console.log(`${contractName} contract deployed at ${deployedContract.address}`)
}

main()
  .then(() => process.exit(0))     // if all is successful
  .catch(error => {              // if there is an error
    console.error(error);
    process.exit(1);
  })

```

To deploy the contract run (from the root of your buidler project):
```
npx buidler run scripts/deploy.js --network localhost
```

The `--network` parameter specifies the blockchain to which buidler connects. If this parameter is absent then the `npx buidler` command starts a 
**Buidler EVM** blockchain and connects to it. You can use this to test that the deployment code works, but any deployment is destroyed as soon
as the script ends.


## Detailed explanation

Define the contract name.
```js
const contractName = "Token"
```

Create `main` as an [asynchronous function](https://javascript.info/async-await),
because several steps in the process take a relatively long time.

```js
// This is a script for deploying contracts. You can adapt it to deploy yours.
const main = async () => {
```

Normally we would only want to deploy to a long lived blockchain, not one that
would be stopped immediately after the deployment - but deploying to an 
ephemeral blockchain can be useful to verify the script works.

```js
  // This is just a convenience check
  if (network.name === "buidlerevm") {
    console.warn(`
You are deploying a contract to a temporary instance of the Buidler EVM network,
which is create and destroyed automatically each time.

If you want to deploy to a localhost instance use --network localhost.
`)
  }
```

The syntax `[deployer] = await ethers.getSigners()` gets the list of accounts and assigns
the first one to the variable `deployer`. Each account is initialized with 10,000 ether, so it doesn't
matter which one we use.

```js
  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying the contracts with the account: ${await deployer.getAddress()}`)
  console.log(`Account balance: ${(await deployer.getBalance()).toString()}`)
```

Create a [ContractFactory](https://docs.ethers.io/v5/api/contract/contract-factory/) and use
that to [deploy the contract](https://docs.ethers.io/v5/api/contract/contract-factory/#ContractFactory-deploy).


```js
  const factory = await ethers.getContractFactory(contractName)
  const deployedContract = await factory.deploy()
  await deployedContract.deployed()

  console.log(`${contractName} contract deployed at ${deployedContract.address}`)
}
```

The `main` function is asynchronous, which means it returns a 
[Promise](https://nodejs.dev/learn/understanding-javascript-promises). The status
of this Promise, once it resolves, determines the return code of the process.

```
main()
  .then(() => process.exit(0))     // if all is successful
  .catch(error => {              // if there is an error
    console.error(error);
    process.exit(1);
  })

```
