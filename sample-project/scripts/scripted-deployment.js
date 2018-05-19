// This script will deploy the Greeter contract, and can be used as an example
// for creating your own scripts.

// There are two ways of running scripts with buidler:
//   * The first one is using the command `buidler run <path-to-the-script>`.
//     If you are going to run your scripts like that, you don't need to
//     initialize anything.
//
//   * The other option is to run it directly with node or another node-based
//     tool. You need to `require()` the buidler environment for it to work, and
//     you can optionally inject it to the `global` object.
//
// Note that a script built to be runnable directly with node can also be run
// using `buidler run`.

// These few lines can be omitted if you prefer to use `buidler run <path>`.
const env = require("../../src/lib/buidler-lib");
// The following one isn't necessary, it copies env's properties into global.
env.injectToGlobal();

// There's no need to create an async function, but `await` is so cool :)
async function deploy() {
  // You can run buidler's tasks in your scripts.
  // Here we run "compile" to be sure we are deploying the latest version.
  // This is done for you if using `buidler run`.
  await run("compile");

  // This can go in the global scope if you always run this with `buidler run`,
  // as everything will be compiled before this script is executed.
  const Greeter = artifacts.require("Greeter");

  const greeter = await Greeter.new();
  console.log("Greeter address:", greeter.address);
}

deploy().catch(console.error);
