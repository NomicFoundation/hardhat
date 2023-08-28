import chalk from "chalk";
import { exec as execCallback, execSync } from "child_process";
import { NomicLabsHardhatPluginError } from "hardhat/internal/core/errors";
import { promisify } from "util";

const exec = promisify(execCallback);

type Remappings = Record<string, string>;

let cachedRemappings: Promise<Remappings> | undefined;

export class HardhatFoundryError extends NomicLabsHardhatPluginError {
  constructor(message: string, parent?: Error) {
    super("hardhat-foundry", message, parent);
  }
}

class ForgeInstallError extends HardhatFoundryError {
  constructor(dependency: string, parent: Error) {
    super(
      `Couldn't install '${dependency}', please install it manually.

${parent.message}
`,
      parent
    );
  }
}

export function getForgeConfig() {
  return JSON.parse(runCmdSync("forge config --json"));
}

export async function getRemappings() {
  // Get remappings only once
  if (cachedRemappings === undefined) {
    cachedRemappings = runCmd("forge remappings").then((remappingsTxt) => {
      const remappings: Remappings = {};
      const remappingLines = remappingsTxt.split(/\r\n|\r|\n/);
      for (const remappingLine of remappingLines) {
        const fromTo = remappingLine.split("=");
        if (fromTo.length !== 2) {
          continue;
        }

        const [from, to] = fromTo;

        // if a remapping result starts with 'node_modules',
        // we remove it from the string so that Hardhat can
        // use node.js resolution to get this kind of dependencies
        const nodeModulesPrefixRegex = /^\/?node_modules\/?/;
        remappings[from] = to.replace(nodeModulesPrefixRegex, "");
      }

      return remappings;
    });
  }

  return cachedRemappings;
}

export async function installDependency(dependency: string) {
  const cmd = `forge install --no-commit ${dependency}`;
  console.log(`Running '${chalk.blue(cmd)}'`);

  try {
    await exec(cmd);
  } catch (error: any) {
    throw new ForgeInstallError(dependency, error);
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
  try {
    const { stdout } = await exec(cmd);
    return stdout;
  } catch (error: any) {
    throw buildForgeExecutionError(error.code, error.message);
  }
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
