# 9. Providing contract information to the dapp

For a dapp to be able to communicate with a contract on the blockchain it needs two pieces of information:

- The address of the contract
- The ABI file that specifies how to communicate with it.

To provide this information to our React dapp we write it in the directory `frontend/src/contracts` as part of the deployment script
(`scripts/deploy.js`). To do that we use [the `fs` module](https://nodejs.org/dist/latest-v12.x/docs/api/fs.html).

These are the changes needed in the deployment script:

1. Add this function:
```js
aync function info4Dapp(contract) {
  const fsP = require("fs").promises
  const contractDir = __dirname + "/../frontend/src/contracts"


  // If the contract directory does not exist, create it
  try {
    await fsP.stat(contractDir)
  } catch (err) {
    await fsP.mkdir(contractDir)
  }

  // Provide the contract address
  await fsP.writeFile(
     contractDir + "/contract-address.json",
     `{ "${contractName}": "${contract.address}" }   \n`
  )    // fsP.writeFile


  // Copy the contract artifact
  await fsP.copyFile(
      `${__dirname}/../artifacts/${contractName}.json`,
      `${contractDir}/${contractName}.json`
  )
}  // info4Dapp
```

2. Add this line at the end of the `main` function:
```js
 await info4Dapp(deployedContract)   
```

3. Rerun the deployer (from the root directory of your Buidler project). It is not a problem to deploy the same contract multiple times, it just gets deployed to
a different address each time.
```bash
npx buidler run scripts/deploy.js --network localhost
```


## Detailed explanation

This function gets the contract information from the `main` function.

```js
async function info4Dapp(contract) {
```

This is the API to [access the file system using promises](https://nodejs.org/dist/latest-v12.x/docs/api/fs.html#fs_fs_promises_api),
which is the way to use `async` / `await`.

```js
  const fsP = require("fs").promises
```

This code runs in the `scripts` directory. But we want the contract information under `frontend/src` so we'll be able to 
import it into the React code.

```js
  const contractDir = __dirname + "/../frontend/src/contracts"

  // If the contract directory does not exist, create it
  try {
    await fsP.stat(contractDir)
  } catch (err) {
    await fsP.mkdir(contractDir)
  }

  // Provide the contract address
  await fsP.writeFile(
     contractDir + "/contract-address.json",
     `{ "${contractName}": "${contract.address}" }   \n`
  )    // fsP.writeFile
```

The compiled contract is in `artifacts/<contractName>.json`. In addition to several fields that are irrelevant to
our purpose here, this file also contains the [Application Binary Interface (ABI)](https://solidity.readthedocs.io/en/v0.7.3/abi-spec.html)
that is used to communicate with the contract on the blockchain.

```js
  // Copy the contract artifact
  await fsP.copyFile(
      `${__dirname}/../artifacts/${contractName}.json`,
      `${contractDir}/${contractName}.json`
  )
}  // info4Dapp
```
