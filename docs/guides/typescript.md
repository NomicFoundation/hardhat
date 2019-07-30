
# TypeScript

In this guide, we will go through the steps to get a Buidler project working with TypeScript. This means that you can write your Buidler config, tasks, scripts and tests in [TypeScript](https://www.typescriptlang.org/). For a general overview of using Buidler refer to the [Getting started guide](/guides/#getting-started).

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