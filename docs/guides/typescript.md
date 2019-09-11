
# TypeScript Support

In this guide, we will go through the steps to get a Buidler project working with TypeScript. This means that you can write your Buidler config, tasks, scripts and tests in [TypeScript](https://www.typescriptlang.org/). For a general overview of using Buidler refer to the [Getting started guide](/guides/#getting-started).


To use Buidler with TypeScript you need to be able to import Buidler from your project to access the [Buidler Runtime Environment], and this wouldn't be possible with a global installation. Because of this Buidler only supports TypeScript on local installations.

## Installing dependencies

We will need to install the TypeScript packages to do this.

In your terminal, run
```npm i -D ts-node typescript```

## Configuration

Let's get started with a fresh Buidler project. Run `npx buidler` and go through the steps to create a sample project. When you're done your project directory should look like this:

```
$ ls -l
total 400
-rw-r--r--    1 fzeoli  staff     195 Jul 30 15:27 buidler.config.js
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 contracts
drwxr-xr-x  502 fzeoli  staff   16064 Jul 30 15:31 node_modules
-rw-r--r--    1 fzeoli  staff  194953 Jul 30 15:31 package-lock.json
-rw-r--r--    1 fzeoli  staff     365 Jul 30 15:31 package.json
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 scripts
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 test
```

Now we are going to rename the config file from `buidler.config.js` to `buidler.config.ts`, run:
 ```mv buidler.config.js buidler.config.ts```

Next, create a file `tsconfig.json` in your project directory and put the following in it:

```json
{
  "compilerOptions": {
    "target": "es5",  
    "module": "commonjs",
    "strict": true,      
    "esModuleInterop": true,
    "outDir": "dist"
  },
  "include": ["./scripts", "./test"],
  "files": [
    "./buidler.config.ts"
  ]
}
```

And that's really all it takes. Now the configuration file will be run as TypeScript. Let's add some code to `buidler.config.ts` to test it out:

```ts
import { task } from '@nomiclabs/buidler/config'

class PointlessLogger {
  log(content: string) {
    console.log(content);
  }
}

task("accounts", "Prints a list of the available accounts", async (taskParams, env, runSuper) => {
  const accounts = await env.ethereum.send("eth_accounts");
  const logger = new PointlessLogger();

  logger.log("Accounts:\n" + accounts.join("\n"));
});

module.exports = {};
```
And run it with `npx buidler accounts`.


## Plugin type extensions
Some Buidler plugins, like [buidler-truffle5](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5) and [buidler-web3](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3), provide type extensions to the [Buidler Runtime Environment] for the variables and types they inject.

For these to be taken into account, you'll need to add the type extension files to the `files` field in your `tsconfig.json`, like this:
```js
"files": [
    "./buidler.config.ts",
    "./node_modules/@nomiclabs/buidler-web3/src/type-extensions.d.ts",
    "./node_modules/@nomiclabs/buidler-truffle5/src/type-extensions.d.ts"
  ]
```

Plugins that include type extensions should have documentation detailing their existance and the path to the type extension file.

## Writing tests and scripts

To write your smart contract tests and scripts you'll most likely need access to an Ethereum library to interact with your smart contracts. This will probably be one of [buidler-truffle5](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5), [buidler-web3](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3) or [buidler-ethers](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3), all of which inject instances into the [Buidler Runtime Environment]. When using JavaScript, all the properties in the BRE are injected into the global scope, and are also available by getting the BRE explicitly. When using TypeScript nothing will be available in the global scope and you will need to import everything explicitly.

An example for tests:
```ts
import env from '@nomiclabs/buidler'
const web3 = env.web3;

// Could also be
// import { web3 } form '@nomiclabs/buidler'

describe('Token', function() {
  
  let accounts;
  
  beforeEach(async function() {
    accounts = await web3.eth.getAccounts();
  });

  it('should test', async function() {
    ...
  });
}
```

An example for scripts:

```ts
import env from "@nomiclabs/buidler";

async function main() {
  await env.run("compile");

  const accounts = await env.ethereum.send("eth_accounts");

  console.log("Accounts:", accounts);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```
[Buidler Runtime Environment]: /documentation/#buidler-runtime-environment-bre