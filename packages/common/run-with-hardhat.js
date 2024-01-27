const { fork } = require("child_process");
const path = require("path");
let hardhatNodeProcess;

/**
 * Ensure hardhat node is running, for tests that require it.
 */
before(async () => {
  console.log("\n### Starting hardhat node instance ###");

  const pathToCli = path.resolve(
    __dirname,
    "..",
    "hardhat-core",
    "internal",
    "cli",
    "cli"
  );
  const pathToEmptyProject = path.resolve(__dirname, "empty-hardhat-project");

  hardhatNodeProcess = fork(pathToCli, ["node"], {
    cwd: pathToEmptyProject,
    env: { HARDHAT_EXPERIMENTAL_ALLOW_NON_LOCAL_INSTALLATION: "true" },
    stdio: "pipe",
  });

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    hardhatNodeProcess.stdout.on("data", (data) => {
      stdout += data.toString();
      if (
        data
          .toString()
          .includes("Started HTTP and WebSocket JSON-RPC server at")
      ) {
        resolve();
      }
    });

    hardhatNodeProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const buildErrorMessage = () => {
      return `There was a problem running hardhat node.

stdout:
${stdout}

stderr:
${stderr}`;
    };

    hardhatNodeProcess.on("error", () => {
      reject(new Error(buildErrorMessage()));
    });

    hardhatNodeProcess.on("exit", (statusCode) => {
      if (statusCode === 0) {
        return;
      }

      reject(new Error(buildErrorMessage()));
    });
  });
});

/**
 * Cleanup the process running hardhat node
 */
after(async () => {
  if (hardhatNodeProcess === undefined) {
    return;
  }
  hardhatNodeProcess.kill();
  console.log("\n### Stopped hardhat node instance ###");
});
