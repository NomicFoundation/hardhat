# Deploying your contracts

When it comes to deploying, there are no plugins that implement
a deployment system for Buidler yet, but there's
[an open issue](https://github.com/nomiclabs/buidler/issues/381)
with some ideas and we'd value your opinion on how to best design it.

In the meantime, we recommend deploying your smart contracts using
scripts. You can deploy the `Greeter` contract from the sample project
by creating a file `scripts/deploy.js` with this contents

```js
// This script uses @nomiclabs/buidler-truffle5
const Greeter = env.artifacts.require("Greeter");

async function main() {
  const greeter = await Greeter.new("Hello, world!");

  console.log("Greeter address:", greeter.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

You can run it with

```sh
npx buidler run --network your-network scripts/deploy.js
```

### Truffle migrations support

You can use Buidler alongside Truffle if you want to use its migration system.
Your contracts written using Buidler will just work with Truffle.

All you need to do is installing Truffle, and follow their [migrations guide](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations).
