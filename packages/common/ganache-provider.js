const { spawn } = require("child_process");
const detect = require("detect-port");

const { GANACHE_PORT } = process.env;

const port = GANACHE_PORT !== undefined ? Number(GANACHE_PORT) : 8545;

function cleanup(ganacheChild) {
  if (!ganacheChild) {
    return;
  }

  return new Promise((resolve) => {
    ganacheChild.on("exit", resolve);
    ganacheChild.kill();
  });
}

async function startGanache(args = []) {
  const ganacheCliPath = require.resolve("ganache-cli/cli.js");

  const env = { ...process.env };
  if (process.version.startsWith("v18")) {
    env["NODE_OPTIONS"] = "--openssl-legacy-provider";
  }

  const ganacheChild = spawn("node", [ganacheCliPath, ...args], { env });
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
