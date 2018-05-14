// These two lines are not necessary if you prefer to use `buidler run <path>`.
// Use them if you want to run your js files as a standalone node scripts.
const env = require("../../src/lib/buidler-lib");
env.injectToGlobal();

const Greeter = artifacts.require("Greeter");

async function deploy() {
  const greeter = await Greeter.new();
  console.log("Greeter address:", greeter.address);
}

deploy().catch(console.error);
