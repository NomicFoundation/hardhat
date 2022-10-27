import chalk from "chalk";
import { exec, execSync } from "child_process";
import { CustomError, HardhatPluginError } from "hardhat/internal/core/errors";

type Remappings = Record<string, string>;

let cachedRemappings: Remappings | undefined;

export class HardhatFoundryError extends HardhatPluginError {
  constructor(message: string) {
    super("hardhat-foundry", message);
  }
}

class ForgeInstallError extends CustomError {
  constructor(dependency: string, parent: Error) {
    super(
      `Command failed. Please continue ${dependency} installation manually.`,
      parent
    );
  }
}

export function getForgeConfig() {
  return JSON.parse(runCmdSync("forge config --json"));
}

export async function getRemappings() {
  // Return remappings if they were already loaded
  if (cachedRemappings !== undefined) {
    return cachedRemappings;
  }

  // Get remappings from foundry
  const remappingsTxt = await runCmd("forge remappings");

  const remappings: Remappings = {};
  const remappingLines = remappingsTxt.split(/\r\n|\r|\n/);
  for (const remappingLine of remappingLines) {
    const fromTo = remappingLine.split("=");
    if (fromTo.length !== 2) {
      continue;
    }

    const [from, to] = fromTo;

    // source names with "node_modules" in it have special treatment in hardhat core, so we skip them
    if (to.includes("node_modules")) {
      continue;
    }

    remappings[from] = to;
  }

  cachedRemappings = remappings;
  return remappings;
}

export async function installDependency(dependency: string) {
  const cmd = `forge install --no-commit ${dependency}`;
  console.log(`Running ${chalk.blue(cmd)}`);

  try {
    runCmdSync(cmd);
  } catch (error) {
    if (error instanceof Error) {
      throw new ForgeInstallError(dependency, error);
    }

    throw error;
  }
}

function runCmdSync(cmd: string): string {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString();
  } catch (error: any) {
    const pluginError = buildForgeExecutionError(
      error.status,
      error.stderr.toString()
    );

    throw pluginError;
  }
}

async function runCmd(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, function (error, stdout) {
      if (error !== null) {
        reject(buildForgeExecutionError(error.code, error.message));
      }

      resolve(stdout);
    });
  });
}

function buildForgeExecutionError(
  exitCode: number | undefined,
  message: string
) {
  switch (exitCode) {
    case 127:
      return new HardhatFoundryError(
        "Couldn't run `forge`. Please check that your foundry installation is correct."
      );
    case 134:
      return new HardhatFoundryError(
        "Running `forge` failed. Please check that your foundry.toml file is correct."
      );
    default:
      return new HardhatFoundryError(
        `Unexpected error while running \`forge\`: ${message}`
      );
  }
}
