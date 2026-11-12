import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { before, describe, it } from "node:test";

import {
  createTmpDir,
  NO_TSX_HOOK_URL,
} from "@nomicfoundation/hardhat-test-utils";
import {
  mkdir,
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

/**
 * These tests run Hardhat in a child process, as the test process itself has
 * tsx preloaded.
 *
 * They run a script that calls `main` instead of `cli.js`, so that they can
 * allow a non-local installation of Hardhat, as the projects are created in a
 * tmp dir. It's a file and not `node --eval`, as Mocha's parallel workers
 * inherit the Node.js flags, so they would run the code again.
 */
const MAIN_URL = new URL(
  "./internal/cli/main.js",
  import.meta.resolve("hardhat"),
).href;

/** The built plugin, as its sources can't be imported without tsx. */
const PLUGIN_URL = import.meta.resolve("@nomicfoundation/hardhat-mocha");

/**
 * The `NODE_OPTIONS` that make a process fail if it loads tsx. They're used
 * instead of a CLI flag, so that Mocha's parallel workers inherit them.
 */
const NO_TSX_NODE_OPTIONS = `--import "${NO_TSX_HOOK_URL}"`;

/** The script that each project uses to run Hardhat. */
const RUNNER_FILE_NAME = "run-hardhat.js";

interface ChildProcessResult {
  exitCode: number | null;
  output: string;
}

async function runMochaTests(
  cwd: string,
  testFiles: string[],
  { parallel, preventTsx }: { parallel: boolean; preventTsx: boolean },
): Promise<ChildProcessResult> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HH_MOCHA_PARALLEL: String(parallel),
  };
  delete env.NODE_OPTIONS;

  if (preventTsx) {
    env.NODE_OPTIONS = NO_TSX_NODE_OPTIONS;
  }

  const child = spawn(
    process.execPath,
    [RUNNER_FILE_NAME, "test", "mocha", "--no-compile", ...testFiles],
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
 * Writes a project with a test file that imports a TypeScript file with a
 * `.ts` extension, one that imports it with a `.js` extension, and the script
 * that runs Hardhat.
 *
 * The config runs Mocha in parallel when `HH_MOCHA_PARALLEL` is `"true"`.
 */
async function writeProject(
  projectPath: string,
  typescriptMode: "node" | "tsx",
): Promise<void> {
  await writeJsonFile(path.join(projectPath, "package.json"), {
    name: "typescript-mode-project",
    version: "1.0.0",
    type: "module",
    hardhat: { typescript: typescriptMode },
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
    `import HardhatMochaPlugin from ${JSON.stringify(PLUGIN_URL)};

const config: object = {
  plugins: [HardhatMochaPlugin],
  test: {
    mocha: {
      parallel: process.env.HH_MOCHA_PARALLEL === "true",
    },
  },
};

export default config;
`,
  );

  await mkdir(path.join(projectPath, "test"));

  await writeUtf8File(
    path.join(projectPath, "test", "helper.ts"),
    `export function greet(name: string): string {
  return \`hello from \${name}\`;
}
`,
  );

  await writeUtf8File(
    path.join(projectPath, "test", "ts-extension.ts"),
    `import assert from "node:assert/strict";

import { greet } from "./helper.ts";

describe("a .ts import", () => {
  it("should import the TypeScript file", () => {
    assert.equal(greet("the test"), "hello from the test");
  });

  it("should keep the NODE_OPTIONS", () => {
    assert.equal(process.env.NODE_OPTIONS, ${JSON.stringify(NO_TSX_NODE_OPTIONS)});
  });
});
`,
  );

  await writeUtf8File(
    path.join(projectPath, "test", "js-extension.ts"),
    `import assert from "node:assert/strict";

import { greet } from "./helper.js";

describe("a .js import", () => {
  it("should import the TypeScript file", () => {
    assert.equal(greet("the test"), "hello from the test");
  });
});
`,
  );
}

describe("TypeScript mode", () => {
  describe(`"node" mode`, () => {
    const project = createTmpDir("hardhat-mocha-typescript-node", "describe");

    before(async () => {
      await writeProject(project.path, "node");
    });

    it("should run the tests in parallel without loading tsx", async () => {
      const { exitCode, output } = await runMochaTests(
        project.path,
        ["test/ts-extension.ts"],
        { parallel: true, preventTsx: true },
      );

      assert.equal(exitCode, 0, output);
      assert.match(output, /2 passing/);
    });

    it("should suggest the .ts extension for a .js import in a test file", async () => {
      const { exitCode, output } = await runMochaTests(
        project.path,
        ["test/js-extension.ts"],
        { parallel: false, preventTsx: true },
      );

      assert.notEqual(exitCode, 0, output);
      assert.match(output, /HHE35/);
      assert.ok(
        output.includes(path.join(project.path, "test", "helper.ts")),
        output,
      );
    });
  });

  describe(`"tsx" mode`, () => {
    const project = createTmpDir("hardhat-mocha-typescript-tsx", "describe");

    before(async () => {
      await writeProject(project.path, "tsx");
    });

    it("should load tsx in the parallel workers", async () => {
      const { exitCode, output } = await runMochaTests(
        project.path,
        ["test/js-extension.ts"],
        { parallel: true, preventTsx: false },
      );

      assert.equal(exitCode, 0, output);
      assert.match(output, /1 passing/);
    });
  });
});
