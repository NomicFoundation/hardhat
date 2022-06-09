const { spawn } = require("child_process");
const detect = require("detect-port");

const { GANACHE_PORT } = process.env;

const port = GANACHE_PORT !== undefined ? Number(GANACHE_PORT) : 8545;

function cleanup(ganacheChild) {
  if (ganacheChild === undefined || ganacheChild === null) {
    return;
  }

  return new Promise((resolve) => {
    ganacheChild.stdout.on("data", (d) => {
      if (/Server has been shut down/.test(d)) {
        resolve();
      }
    });
    ganacheChild.on("exit", resolve);
    ganacheChild.kill("SIGINT");
  });
}

async function startGanache(args = []) {
  const ganacheCliPath = require.resolve("ganache/dist/node/cli.js");

  const ganacheChild = spawn("node", [ganacheCliPath, ...args]);
  console.time("Ganache spawn");

  // wait for ganache child process to start
  await new Promise((resolve, reject) => {
    ganacheChild.stdout.setEncoding("utf8");
    ganacheChild.stderr.setEncoding("utf8");

    function checkIsRunning(data) {
      const log = data.toString();

      const logLower = log.toLowerCase();
      const isRunning = logLower.includes("listening on");
      if (isRunning) {
        return resolve();
      }
      const isError = logLower.includes("error") && !log.includes("mnemonic");
      if (isError) {
        return reject(new Error(log));
      }
    }

    ganacheChild.stdout.on("data", checkIsRunning);
    ganacheChild.stderr.on("data", checkIsRunning);
  });
  console.timeEnd("Ganache spawn");
  return ganacheChild;
}

/**
 * Returns true if port is already in use.
 */
async function isGanacheRunning() {
  const suggestedFreePort = await detect(port);
  return suggestedFreePort !== port;
}

async function ganacheSetup(args = []) {
  if (await isGanacheRunning()) {
    // if ganache is already running, we just reuse the instance
    return null;
  }

  return startGanache(args);
}

module.exports.ganacheSetup = ganacheSetup;
module.exports.cleanup = cleanup;
