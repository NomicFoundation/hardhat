// These two lines are not necessary if you prefer to use `buidler run <path>`.
// Use them if you want to run your js files as a standalone node scripts.
const env = require("../../src/lib/buidler-lib");
env.injectToGlobal();

async function deploy() {
  //This is not necessary if using `buidler run`.
  await run("compile");

  // This can go in the global scope if you always run this with `buidler run`,
  // as everything will be compiled before this script is executed.
  const Greeter = artifacts.require("Greeter");

  const greeter = await Greeter.new();
  console.log("Greeter address:", greeter.address);
}

deploy().catch(console.error);
