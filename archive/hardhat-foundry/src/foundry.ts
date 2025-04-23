import picocolors from "picocolors";
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

export function parseRemappings(remappingsTxt: string): Remappings {
  const remappings: Remappings = {};
  const remappingLines = remappingsTxt.split(/\r\n|\r|\n/);
  for (const remappingLine of remappingLines) {
    if (remappingLine.trim() === "") {
      continue;
    }

    if (remappingLine.includes(":")) {
      throw new HardhatFoundryError(
        `Invalid remapping '${remappingLine}', remapping contexts are not allowed`
      );
    }

    if (!remappingLine.includes("=")) {
      throw new HardhatFoundryError(
        `Invalid remapping '${remappingLine}', remappings without a target are not allowed`
      );
    }

    const fromTo = remappingLine.split("=");

    // if the remapping already exists, we ignore it because the first one wins
    if (remappings[fromTo[0]] !== undefined) {
      continue;
    }

    remappings[fromTo[0]] = fromTo[1];
  }

  return remappings;
}

export async function getRemappings() {
  // Get remappings only once
  if (cachedRemappings === undefined) {
    cachedRemappings = runCmd("forge remappings").then(parseRemappings);
  }

  return cachedRemappings;
}

export async function installDependency(dependency: string) {
  const cmd = `forge install --no-commit ${dependency}`;
  console.log(`Running '${picocolors.blue(cmd)}'`);

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
