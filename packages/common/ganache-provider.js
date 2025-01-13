const { spawn } = require("child_process");
const detect = require("detect-port");
const semver = require("semver"); // For more reliable version checking

const { GANACHE_PORT } = process.env;

// Use the provided GANACHE_PORT or default to 8545
const port = GANACHE_PORT !== undefined ? Number(GANACHE_PORT) : 8545;

/**
 * Cleans up the Ganache child process.
 * @param {ChildProcess} ganacheChild - The Ganache child process.
 * @returns {Promise<void>} - Resolves when the process exits.
 */
function cleanup(ganacheChild) {
  // If ganacheChild is null or undefined, return early
  if (!ganacheChild) {
    return;
  }

  return new Promise((resolve) => {
    ganacheChild.on("exit", resolve);
    ganacheChild.kill();
  });
}

/**
 * Starts a Ganache instance with the provided arguments.
 * @param {string[]} args - Arguments to pass to Ganache.
 * @returns {Promise<ChildProcess>} - The Ganache child process.
 */
async function startGanache(args = []) {
  const ganacheCliPath = require.resolve("ganache-cli/cli.js");

  // Clone the environment variables
  const env = { ...process.env };

  // Add --openssl-legacy-provider for Node.js v18 and above
  if (semver.satisfies(process.version, ">=18.0.0")) {
    env["NODE_OPTIONS"] = "--openssl-legacy-provider";
  }

  // Spawn the Ganache process
  const ganacheChild = spawn("node", [ganacheCliPath, ...args], { env });
  console.time("Ganache spawn");

  // Wait for Ganache to start
  await new Promise((resolve, reject) => {
    ganacheChild.stdout.setEncoding("utf8");
    ganacheChild.stderr.setEncoding("utf8");

    /**
     * Checks if Ganache is running or if an error occurred.
     * @param {string} data - The output data from Ganache.
     */
    function checkIsRunning(data) {
      const logLower = data.toLowerCase();
      const isRunning = logLower.includes("listening on");
      if (isRunning) {
        return resolve();
      }
      const isError = logLower.includes("error") && !data.includes("mnemonic");
      if (isError) {
        return reject(new Error(data));
      }
    }

    ganacheChild.stdout.on("data", checkIsRunning);
    ganacheChild.stderr.on("data", checkIsRunning);
  });

  console.timeEnd("Ganache spawn");
  return ganacheChild;
}

/**
 * Checks if Ganache is already running on the specified port.
 * @returns {Promise<boolean>} - True if the port is in use, false otherwise.
 */
async function isGanacheRunning() {
  const suggestedFreePort = await detect(port);
  return suggestedFreePort !== port;
}

/**
 * Sets up Ganache. Reuses an existing instance if one is already running.
 * @param {string[]} args - Arguments to pass to Ganache.
 * @returns {Promise<ChildProcess|null>} - The Ganache child process or null if reusing an existing instance.
 */
async function ganacheSetup(args = []) {
  if (await isGanacheRunning()) {
    // If Ganache is already running, reuse the instance
    return null;
  }

  return startGanache(args);
}

module.exports.ganacheSetup = ganacheSetup;
module.exports.cleanup = cleanup;
