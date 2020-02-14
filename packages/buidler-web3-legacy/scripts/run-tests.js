const process = require("process");
const { spawn } = require("child_process");
const shell = require("shelljs");
const os = require("os");

process.env.FORCE_COLOR = "3";

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

let ganacheChild = null;

function cleanup() {
  if (ganacheChild) {
    ganacheChild.kill();
  }
}

async function startGanache() {
  ganacheChild = spawn("node", ["../../node_modules/ganache-cli/cli.js"], {
    stdio: "ignore"
  });
  await sleep(4000);
}

function isGanacheRunning() {
  const nc = shell.exec("nc -z localhost 8545");

  return nc.code === 0;
}

async function main() {
  if (os.type() !== "Windows_NT" && isGanacheRunning()) {
    console.log("Using existing ganache instance");
  } else {
    console.log("Starting our own ganache instance");
    await startGanache();
  }

  try {
    shell.config.fatal = true;
    shell.exec("node ../../node_modules/mocha/bin/mocha --exit");
    shell.exec("node web3-lazy-object-tests/when-accessing-web3-class.js");
    shell.exec("node web3-lazy-object-tests/when-accessing-web3-object.js");
    shell.exec("node web3-lazy-object-tests/when-requiring-web3-module.js");
  } finally {
    cleanup();
  }
}

main().catch(() => process.exit(1));
