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

import { getTemplates } from "../../../src/internal/cli/init/template.js";

/**
 * These tests run Hardhat's built JavaScript in a child process, as the test
 * process itself has tsx preloaded.
 *
 * The CLI tests run `main` instead of `cli.js`, so that they can allow a
 * non-local installation of Hardhat, as the in-process CLI tests do.
 */
const MAIN_URL = new URL(
  "../../../dist/src/internal/cli/main.js",
  import.meta.url,
).href;
const INDEX_URL = new URL("../../../dist/src/index.js", import.meta.url).href;
const CONFIG_URL = new URL("../../../dist/src/config.js", import.meta.url).href;

/**
 * The flag that disables Node.js type stripping, which is what makes Hardhat
 * fall back to tsx to import a TypeScript config.
 */
const NO_STRIP_TYPES_FLAG = [
  "--no-experimental-strip-types",
  "--no-strip-types",
].find((flag) => process.allowedNodeEnvironmentFlags.has(flag));

const PRINT_TYPESCRIPT_MODE_CODE = `const { default: hre } = await import(${JSON.stringify(INDEX_URL)});
console.log(\`typescript mode: \${hre.config.typescript}\`);`;

/** The template that the `--init` tests use, as it has the fewest dependencies. */
const INIT_TEMPLATE_NAME = "minimal";

interface ChildProcessResult {
  exitCode: number | null;
  output: string;
}

async function runNode(
  cwd: string,
  code: string,
  { preventTsx, nodeArgs = [] }: { preventTsx: boolean; nodeArgs?: string[] },
): Promise<ChildProcessResult> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.NODE_OPTIONS;

  const child = spawn(
    process.execPath,
    [
      ...(preventTsx ? ["--import", NO_TSX_HOOK_URL] : []),
      ...nodeArgs,
      "--input-type=module",
      "--eval",
      code,
    ],
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

async function runCli(
  cwd: string,
  args: string[],
  options: { preventTsx: boolean },
): Promise<ChildProcessResult> {
  return await runNode(
    cwd,
    `const { main } = await import(${JSON.stringify(MAIN_URL)});
await main(${JSON.stringify(args)}, {
  registerTsx: true,
  allowNonlocalHardhatInstallation: true,
});`,
    options,
  );
}

async function writePackageJson(
  projectPath: string,
  hardhatField: Record<string, unknown> | undefined,
  devDependencies?: Record<string, string>,
): Promise<void> {
  await writeJsonFile(path.join(projectPath, "package.json"), {
    name: "typescript-mode-project",
    version: "1.0.0",
    type: "module",
    ...(hardhatField !== undefined ? { hardhat: hardhatField } : {}),
    ...(devDependencies !== undefined ? { devDependencies } : {}),
  });
}

/**
 * Writes a project with a TypeScript config, a TypeScript script that imports
 * another TypeScript file with a `.ts` extension, and one that imports it with
 * a `.js` extension.
 *
 * The config also has a `js-extension` task, whose action is a TypeScript file
 * imported with a `.js` extension.
 */
async function writeProject(
  projectPath: string,
  hardhatField: Record<string, unknown> | undefined,
): Promise<void> {
  await writePackageJson(projectPath, hardhatField);

  await writeUtf8File(
    path.join(projectPath, "hardhat.config.ts"),
    `import { task } from ${JSON.stringify(CONFIG_URL)};

console.log("config imported");

const config: object = {
  tasks: [
    task("js-extension")
      .setAction(() => import("./tasks/js-extension.js"))
      .build(),
  ],
};

export default config;
`,
  );

  await mkdir(path.join(projectPath, "tasks"));

  await writeUtf8File(
    path.join(projectPath, "tasks", "js-extension.ts"),
    `export default async function (): Promise<void> {
  console.log("hello from the task");
}
`,
  );

  await mkdir(path.join(projectPath, "scripts"));

  await writeUtf8File(
    path.join(projectPath, "scripts", "helper.ts"),
    `export function greet(name: string): string {
  return \`hello from \${name}\`;
}
`,
  );

  await writeUtf8File(
    path.join(projectPath, "scripts", "main.ts"),
    `import { greet } from "./helper.ts";

const name: string = "the script";

console.log(greet(name));
`,
  );

  await writeUtf8File(
    path.join(projectPath, "scripts", "js-extension.ts"),
    `import { greet } from "./helper.js";

console.log(greet("the .js import"));
`,
  );
}

/**
 * Writes an empty project to initialize with `--init`. Its `package.json`
 * already has the template's dependencies, so that `--init` doesn't install
 * anything.
 */
async function writeInitProject(
  projectPath: string,
  hardhatField: Record<string, unknown> | undefined,
): Promise<void> {
  const template = (await getTemplates()).find(
    (t) => t.name === INIT_TEMPLATE_NAME,
  );

  assert.ok(
    template !== undefined,
    `The "${INIT_TEMPLATE_NAME}" template doesn't exist`,
  );

  const { devDependencies = {}, peerDependencies = {} } = template.packageJson;

  await writePackageJson(
    projectPath,
    hardhatField,
    Object.fromEntries(
      Object.entries({ ...devDependencies, ...peerDependencies }).map(
        ([name, version]) => [name, version.replace(/^workspace:/, "")],
      ),
    ),
  );
}

describe("TypeScript mode", () => {
  describe(`"node" mode`, () => {
    const project = createTmpDir("typescript-mode-node", "describe");
    const initProject = createTmpDir("typescript-mode-node-init", "describe");

    before(async () => {
      await writeProject(project.path, { typescript: "node" });
    });

    it("should print the version without loading tsx", async () => {
      const { exitCode, output } = await runCli(project.path, ["--version"], {
        preventTsx: true,
      });

      assert.equal(exitCode, 0, output);
    });

    it("should initialize a project without loading tsx", async () => {
      await writeInitProject(initProject.path, { typescript: "node" });

      const { exitCode, output } = await runCli(
        initProject.path,
        ["--init", "--template", INIT_TEMPLATE_NAME],
        { preventTsx: true },
      );

      assert.equal(exitCode, 0, output);
      assert.match(output, /Project initialized/);
    });

    it("should run a TypeScript script without loading tsx", async () => {
      const { exitCode, output } = await runCli(
        project.path,
        ["run", "scripts/main.ts"],
        { preventTsx: true },
      );

      assert.equal(exitCode, 0, output);
      assert.match(output, /hello from the script/);
    });

    it("should create the HRE programmatically without loading tsx", async () => {
      const { exitCode, output } = await runNode(
        project.path,
        PRINT_TYPESCRIPT_MODE_CODE,
        { preventTsx: true },
      );

      assert.equal(exitCode, 0, output);
      assert.match(output, /typescript mode: node/);
    });

    it(
      "shouldn't fall back to tsx to import the config when Node.js can't strip types",
      { skip: NO_STRIP_TYPES_FLAG === undefined },
      async () => {
        assert.ok(NO_STRIP_TYPES_FLAG !== undefined, "Unreachable");

        const { exitCode, output } = await runNode(
          project.path,
          PRINT_TYPESCRIPT_MODE_CODE,
          { preventTsx: true, nodeArgs: [NO_STRIP_TYPES_FLAG] },
        );

        assert.notEqual(exitCode, 0, output);
        assert.match(output, /ERR_UNKNOWN_FILE_EXTENSION/);
        assert.doesNotMatch(output, /tsx was loaded/);
      },
    );

    it("should suggest the .ts extension for a .js import of a TypeScript file", async () => {
      const { exitCode, output } = await runCli(
        project.path,
        ["run", "scripts/js-extension.ts"],
        { preventTsx: true },
      );

      assert.notEqual(exitCode, 0, output);
      assert.match(output, /HHE35/);
      assert.ok(
        output.includes(path.join(project.path, "scripts", "helper.ts")),
        output,
      );
    });

    it("should suggest the .ts extension for a .js import of a task action", async () => {
      const { exitCode, output } = await runCli(
        project.path,
        ["js-extension"],
        { preventTsx: true },
      );

      assert.notEqual(exitCode, 0, output);
      assert.match(output, /HHE35/);
      assert.ok(
        output.includes(path.join(project.path, "tasks", "js-extension.ts")),
        output,
      );
    });
  });

  describe(`"tsx" mode`, () => {
    const project = createTmpDir("typescript-mode-tsx", "describe");
    const initProject = createTmpDir("typescript-mode-tsx-init", "describe");

    before(async () => {
      await writeProject(project.path, undefined);
    });

    it("should print the version without loading tsx", async () => {
      const { exitCode, output } = await runCli(project.path, ["--version"], {
        preventTsx: true,
      });

      assert.equal(exitCode, 0, output);
    });

    it("should initialize a project without loading tsx", async () => {
      await writeInitProject(initProject.path, undefined);

      const { exitCode, output } = await runCli(
        initProject.path,
        ["--init", "--template", INIT_TEMPLATE_NAME],
        { preventTsx: true },
      );

      assert.equal(exitCode, 0, output);
      assert.match(output, /Project initialized/);
    });

    it("should run a TypeScript script", async () => {
      const { exitCode, output } = await runCli(
        project.path,
        ["run", "scripts/main.ts"],
        { preventTsx: false },
      );

      assert.equal(exitCode, 0, output);
      assert.match(output, /hello from the script/);
    });

    it("should resolve a .js import of a TypeScript file", async () => {
      const { exitCode, output } = await runCli(
        project.path,
        ["run", "scripts/js-extension.ts"],
        { preventTsx: false },
      );

      assert.equal(exitCode, 0, output);
      assert.match(output, /hello from the \.js import/);
    });

    it("should resolve a .js import of a task action", async () => {
      const { exitCode, output } = await runCli(
        project.path,
        ["js-extension"],
        { preventTsx: false },
      );

      assert.equal(exitCode, 0, output);
      assert.match(output, /hello from the task/);
    });

    it(
      "should fall back to tsx to import the config when Node.js can't strip types",
      { skip: NO_STRIP_TYPES_FLAG === undefined },
      async () => {
        assert.ok(NO_STRIP_TYPES_FLAG !== undefined, "Unreachable");

        const { exitCode, output } = await runNode(
          project.path,
          PRINT_TYPESCRIPT_MODE_CODE,
          { preventTsx: false, nodeArgs: [NO_STRIP_TYPES_FLAG] },
        );

        assert.equal(exitCode, 0, output);
        assert.match(output, /typescript mode: tsx/);
      },
    );

    it("should load tsx before importing the config", async () => {
      const { exitCode, output } = await runCli(
        project.path,
        ["run", "scripts/main.ts"],
        { preventTsx: true },
      );

      assert.notEqual(exitCode, 0, output);
      assert.match(output, /tsx was loaded/);
      assert.doesNotMatch(output, /config imported/);
    });
  });

  describe("an invalid mode", () => {
    const project = createTmpDir("typescript-mode-invalid", "describe");

    before(async () => {
      await writeProject(project.path, { typescript: "deno" });
    });

    it("should throw before importing the config", async () => {
      const { exitCode, output } = await runCli(
        project.path,
        ["run", "scripts/main.ts"],
        { preventTsx: false },
      );

      assert.notEqual(exitCode, 0, output);
      assert.match(output, /HHE34/);
      assert.doesNotMatch(output, /config imported/);
    });
  });
});
