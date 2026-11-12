import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { before, describe, it } from "node:test";

import {
  createTmpDir,
  NO_TSX_HOOK_URL,
} from "@nomicfoundation/hardhat-test-utils";
import {
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

/**
 * These tests run Hardhat in a child process, as the test process itself has
 * tsx preloaded.
 *
 * They run a script that calls `main` instead of `cli.js`, so that they can
 * allow a non-local installation of Hardhat, as the project is created in a
 * tmp dir.
 */
const MAIN_URL = new URL(
  "./internal/cli/main.js",
  import.meta.resolve("hardhat"),
).href;

/** The built plugin, as its sources can't be imported without tsx. */
const PLUGIN_URL = import.meta.resolve("@nomicfoundation/hardhat-verify");

/** The script that the project uses to run Hardhat. */
const RUNNER_FILE_NAME = "run-hardhat.js";

interface ChildProcessResult {
  exitCode: number | null;
  output: string;
}

async function runHardhat(
  cwd: string,
  args: string[],
): Promise<ChildProcessResult> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.NODE_OPTIONS;

  const child = spawn(
    process.execPath,
    ["--import", NO_TSX_HOOK_URL, RUNNER_FILE_NAME, ...args],
    { cwd, env, stdio: ["ignore", "pipe", "pipe"] },
  );

  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    output += chunk;
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });

  return { exitCode, output };
}

/**
 * Writes a project in the "node" TypeScript mode with a constructor arguments
 * module that imports a TypeScript file with a `.js` extension, and the script
 * that runs Hardhat.
 */
async function writeProject(projectPath: string): Promise<void> {
  await writeJsonFile(path.join(projectPath, "package.json"), {
    name: "typescript-mode-project",
    version: "1.0.0",
    type: "module",
    hardhat: { typescript: "node" },
  });

  await writeUtf8File(
    path.join(projectPath, RUNNER_FILE_NAME),
    `const { main } = await import(${JSON.stringify(MAIN_URL)});

await main(process.argv.slice(2), {
  registerTsx: true,
  allowNonlocalHardhatInstallation: true,
});
`,
  );

  await writeUtf8File(
    path.join(projectPath, "hardhat.config.ts"),
    `import HardhatVerifyPlugin from ${JSON.stringify(PLUGIN_URL)};

const config: object = {
  plugins: [HardhatVerifyPlugin],
};

export default config;
`,
  );

  await writeUtf8File(
    path.join(projectPath, "values.ts"),
    `export const values: string[] = ["1"];
`,
  );

  await writeUtf8File(
    path.join(projectPath, "constructor-args.ts"),
    `import { values } from "./values.js";

export default values;
`,
  );
}

describe(`"node" TypeScript mode`, () => {
  const project = createTmpDir("hardhat-verify-typescript-node", "describe");

  before(async () => {
    await writeProject(project.path);
  });

  it("should suggest the .ts extension for a .js import in the constructor arguments module", async () => {
    const { exitCode, output } = await runHardhat(project.path, [
      "verify",
      "etherscan",
      "--constructor-args-path",
      "constructor-args.ts",
      "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    ]);

    assert.notEqual(exitCode, 0, output);
    assert.match(output, /HHE35/);
    assert.ok(output.includes(path.join(project.path, "values.ts")), output);
  });
});
