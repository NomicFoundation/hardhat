import type { Template } from "../../../../src/internal/cli/init/template.js";
import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import assert from "node:assert/strict";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
  assertRejectsWithHardhatError,
  createTmpDir,
  disableConsole,
} from "@nomicfoundation/hardhat-test-utils";
import {
  ensureDir,
  exists,
  createFile,
  readJsonFile,
  readUtf8File,
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

import {
  assertNoNonInteractiveClashes,
  copyProjectFiles,
  copyProjectFilesNonInteractive,
  validatePackageJson,
  getTemplate,
  getWorkspace,
  initHardhat,
  initHardhat3NonInteractive,
  installProjectDependencies,
  printWelcomeMessage,
  relativeTemplateToWorkspacePath,
  relativeWorkspaceToTemplatePath,
  shouldUpdateDependency,
} from "../../../../src/internal/cli/init/init.js";
import { getTemplates } from "../../../../src/internal/cli/init/template.js";

// TODO: The push and merge_group checks should be limited to events associated
// with a release PR merge.
const skipNetworkSlowTests =
  process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" ||
  process.env.GITHUB_EVENT_NAME === "push" ||
  process.env.GITHUB_EVENT_NAME === "merge_group" ||
  process.env.GITHUB_HEAD_REF?.startsWith("changeset-release/") === true;

// initHardhat3NonInteractive reads `process.cwd()` internally, and several
// tests below write/read files via relative paths. This helper combines a
// per-test tmp dir with a `chdir` into it.
function useTmpDirAsCwd(name: string): { readonly path: string } {
  const tmp = createTmpDir(name, "test");
  let previousCwd: string;
  beforeEach(() => {
    previousCwd = process.cwd();
    process.chdir(tmp.path);
  });
  afterEach(() => {
    process.chdir(previousCwd);
  });
  return tmp;
}

// Writes the standard config files needed for tests that run `pnpm add` from
// inside a tmp dir.
//
// `.npmrc` re-introduces `minimum-release-age-exclude` because we run tests
// under `pnpm`, and the root `.npmrc`'s array setting gets lost on its way to
// the subprocess.
//
// `pnpm-workspace.yaml` makes pnpm treat the tmp dir as its own workspace
// root. Without it, pnpm would walk up to the repo's `pnpm-workspace.yaml`
// and record this test's install under `tmp/<name>:` in the workspace's
// `pnpm-lock.yaml`.
async function setUpPnpmTmpDir(dir: string): Promise<void> {
  await writeUtf8File(
    path.join(dir, ".npmrc"),
    'minimum-release-age-exclude[]="hardhat"\nminimum-release-age-exclude[]="@nomicfoundation/*"',
  );
  await writeUtf8File(path.join(dir, "pnpm-workspace.yaml"), "packages: []\n");
}

// NOTE: This uses network to access the npm registry
describe("printWelcomeMessage", () => {
  disableConsole();

  it("should not throw if latest version of hardhat cannot be retrieved from the registry", async () => {
    await printWelcomeMessage();
  });
});

describe("getWorkspace", () => {
  const tmp = createTmpDir("getWorkspace", "test");

  describe("workspace is not a directory", async () => {
    const innerTmp = createTmpDir("invalidDirectory", "test");

    it("should throw if the provided workspace is not a directory", async () => {
      const filePath = path.join(innerTmp.path, "file.txt");

      await writeUtf8File(filePath, "some content");

      await assertRejectsWithHardhatError(
        async () => await getWorkspace(filePath),
        HardhatError.ERRORS.CORE.GENERAL.WORKSPACE_MUST_BE_A_DIRECTORY,
        {
          workspace: path.resolve(filePath),
        },
      );
    });
  });

  it("should throw if the provided workspace is within an already initialized hardhat project", async () => {
    await ensureDir(path.join(tmp.path, "hardhat-project"));
    await writeUtf8File(path.join(tmp.path, "hardhat.config.ts"), "");
    await assertRejectsWithHardhatError(
      async () => await getWorkspace(path.join(tmp.path, "hardhat-project")),
      HardhatError.ERRORS.CORE.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
      {
        hardhatProjectRootPath: path.join(tmp.path, "hardhat.config.ts"),
      },
    );
  });
  it("should return the provided workspace");
});

describe("getTemplate", () => {
  it("should throw if the provided template does not exist", async () => {
    await assertRejectsWithHardhatError(
      async () => await getTemplate("hardhat-3", "non-existent-template"),
      HardhatError.ERRORS.CORE.GENERAL.TEMPLATE_NOT_FOUND,
      {
        template: "non-existent-template",
      },
    );
  });
  it("should return the provided template", async () => {
    const [template] = await getTemplate("hardhat-3", "mocha-ethers");
    assert.equal(template.name, "mocha-ethers");
  });
});

describe("validatePackageJson", () => {
  const tmp = createTmpDir("validatePackageJson", "test");
  const packageJsonPath = () => path.join(tmp.path, "package.json");

  it("should create the package.json file if it does not exist", async () => {
    assert.ok(
      !(await exists(packageJsonPath())),
      "package.json should not exist before ensuring it exists",
    );

    await validatePackageJson(
      tmp.path,
      {
        name: "package-name",
        version: "0.0.1",
        type: "module",
      },
      false,
    );

    assert.ok(await exists(packageJsonPath()), "package.json should exist");
  });

  it("should not create the package.json file if it already exists", async () => {
    const before = {
      name: "a unique name that ensureProjectPackageJson definitely does not set",
      type: "module",
    };

    await writeJsonFile(packageJsonPath(), before);

    await validatePackageJson(
      tmp.path,
      {
        name: "package-name",
        version: "0.0.1",
        type: "module",
      },
      false,
    );

    const after = await readJsonFile(packageJsonPath());

    assert.deepEqual(before, after);
  });

  it("should throw if the package.json is not for an esm package", async () => {
    await writeJsonFile(packageJsonPath(), {});

    await assertRejectsWithHardhatError(
      async () =>
        await validatePackageJson(
          tmp.path,
          {
            name: "package-name",
            version: "0.0.1",
            type: "module",
          },
          false,
        ),
      HardhatError.ERRORS.CORE.GENERAL.ONLY_ESM_SUPPORTED,
      {},
    );
  });

  it("should migrate package.json to esm if the user opts-in to it", async () => {
    await writeJsonFile(packageJsonPath(), {});

    await validatePackageJson(
      tmp.path,
      {
        name: "package-name",
        version: "0.0.1",
        type: "module",
      },
      true,
    );

    const pkg: PackageJson = await readJsonFile(packageJsonPath());

    assert.equal(pkg.type, "module");
  });

  it("should not migrate package.json to esm when shouldUseEsm is false and type is not set", async () => {
    await writeJsonFile(packageJsonPath(), {});

    await validatePackageJson(
      tmp.path,
      {
        name: "package-name",
        version: "0.0.1",
      },
      false,
    );

    const pkg: PackageJson = await readJsonFile(packageJsonPath());

    assert.equal(pkg.type, undefined);
  });

  it("should not migrate package.json to esm when shouldUseEsm is false and type is commonjs", async () => {
    const before = {
      name: "a unique name that ensureProjectPackageJson definitely does not set",
      type: "commonjs",
    };

    await writeJsonFile(packageJsonPath(), before);

    await validatePackageJson(
      tmp.path,
      {
        name: "package-name",
        version: "0.0.1",
      },
      false,
    );

    const after: PackageJson = await readJsonFile(packageJsonPath());

    assert.deepEqual(before, after);
  });

  it("should not migrate package.json to esm when shouldUseEsm is false and no package.json exists", async () => {
    assert.ok(
      !(await exists(packageJsonPath())),
      "package.json should not exist before ensuring it exists",
    );

    await validatePackageJson(
      tmp.path,
      {
        name: "package-name",
        version: "0.0.1",
      },
      false,
    );

    const after: PackageJson = await readJsonFile(packageJsonPath());

    assert.equal(after.type, undefined);
  });
});

describe("relativeWorkspaceToTemplatePath", () => {
  it("should convert .gitignore to gitignore", () => {
    assert.equal(relativeWorkspaceToTemplatePath(".gitignore"), "gitignore");
  });
  it("should not convert gitignore", () => {
    assert.equal(relativeWorkspaceToTemplatePath("gitignore"), "gitignore");
  });
  it("should convert .gitignore to gitignore in a subdirectory", () => {
    assert.equal(
      relativeWorkspaceToTemplatePath(path.join("subdirectory", ".gitignore")),
      path.join("subdirectory", "gitignore"),
    );
  });
});

describe("relativeTemplateToWorkspacePath", () => {
  it("should convert gitignore to .gitignore", () => {
    assert.equal(relativeTemplateToWorkspacePath("gitignore"), ".gitignore");
  });
  it("should not convert .gitignore", () => {
    assert.equal(relativeTemplateToWorkspacePath(".gitignore"), ".gitignore");
  });
  it("should convert gitignore to .gitignore in a subdirectory", () => {
    assert.equal(
      relativeTemplateToWorkspacePath(path.join("subdirectory", "gitignore")),
      path.join("subdirectory", ".gitignore"),
    );
  });
});

describe("copyProjectFiles", () => {
  const tmp = createTmpDir("copyProjectFiles", "test");

  disableConsole();

  describe("when force is true", () => {
    it("should copy the template files to the workspace and overwrite existing files", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      // Create template files with "some content" in the workspace
      const workspaceFiles = template.files.map(
        relativeTemplateToWorkspacePath,
      );
      for (const file of workspaceFiles) {
        const pathToFile = path.join(tmp.path, file);
        await ensureDir(path.dirname(pathToFile));
        await writeUtf8File(pathToFile, "some content");
      }
      // Copy the template files to the workspace
      await copyProjectFiles(tmp.path, template, true);
      // Check that the template files in the workspace have been overwritten
      for (const file of workspaceFiles) {
        const pathToFile = path.join(tmp.path, file);
        assert.notEqual(await readUtf8File(pathToFile), "some content");
      }
    });
    it("should copy the .gitignore file correctly", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      // Copy the template files to the workspace
      await copyProjectFiles(tmp.path, template, true);
      // Check that the .gitignore exists but gitignore does not
      assert.ok(
        await exists(path.join(tmp.path, ".gitignore")),
        ".gitignore should exist",
      );
      assert.ok(
        !(await exists(path.join(tmp.path, "gitignore"))),
        "gitignore should NOT exist",
      );
    });
  });
  describe("when force is false", () => {
    it("should copy the template files to the workspace and NOT overwrite existing files", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      // Create template files with "some content" in the workspace
      const workspaceFiles = template.files.map(
        relativeTemplateToWorkspacePath,
      );
      for (const file of workspaceFiles) {
        const pathToFile = path.join(tmp.path, file);
        await ensureDir(path.dirname(pathToFile));
        await writeUtf8File(pathToFile, "some content");
      }
      // Copy the template files to the workspace
      await copyProjectFiles(tmp.path, template, false);
      // Check that the template files in the workspace have not been overwritten
      for (const file of workspaceFiles) {
        const pathToFile = path.join(tmp.path, file);
        assert.equal(await readUtf8File(pathToFile), "some content");
      }
    });
    it("should copy the .gitignore file correctly", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      // Copy the template files to the workspace
      await copyProjectFiles(tmp.path, template, false);
      // Check that the .gitignore exists but gitignore does not
      assert.ok(
        await exists(path.join(tmp.path, ".gitignore")),
        ".gitignore should exist",
      );
      assert.ok(
        !(await exists(path.join(tmp.path, "gitignore"))),
        "gitignore should NOT exist",
      );
    });

    it("Regression test: should not scan unrelated workspace files to detect overwrites", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      const unrelatedDirPath = path.join(tmp.path, "unrelated");
      const unrelatedFilePath = path.join(unrelatedDirPath, "ignored.txt");
      await ensureDir(unrelatedDirPath);
      await createFile(unrelatedFilePath);

      const originalReaddir = fsPromises.readdir;
      const readdirMock = mock.method(
        fsPromises,
        "readdir",
        async (...args: Parameters<typeof originalReaddir>) => {
          if (args[0] === tmp.path && args[1]?.withFileTypes === true) {
            throw new Error(
              "copyProjectFiles should not scan the workspace recursively",
            );
          }

          return await Reflect.apply(originalReaddir, fsPromises, args);
        },
      );

      try {
        await copyProjectFiles(tmp.path, template, false);

        const oneCopiedTemplateFile = path.join(
          tmp.path,
          relativeTemplateToWorkspacePath(template.files[0]),
        );
        assert.ok(
          await exists(oneCopiedTemplateFile),
          `expected template file ${oneCopiedTemplateFile} to be copied without walking the workspace`,
        );
      } finally {
        readdirMock.mock.restore();
      }
    });

    it("Regression test: should still throw if a directory clashes with a destination file", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      const pathWithDirectoryClash = path.join(tmp.path, "hardhat.config.ts");

      await ensureDir(pathWithDirectoryClash);

      await assertRejects(
        copyProjectFiles(tmp.path, template, false),
        (error) => error.name === "IsDirectoryError",
        "expected copyProjectFiles to reject with IsDirectoryError",
      );
    });
  });

  it("should install skills and create CLAUDE.md and .claude for the mocha-ethers template", async () => {
    const [template] = await getTemplate("hardhat-3", "mocha-ethers");
    await copyProjectFiles(process.cwd(), template, true);

    assert.ok(
      await exists(
        path.join(process.cwd(), ".agents", "skills", "hardhat", "SKILL.md"),
      ),
      "hardhat skill should be installed",
    );
    assert.ok(
      await exists(
        path.join(
          process.cwd(),
          ".agents",
          "skills",
          "hardhat-toolbox-mocha-ethers",
          "SKILL.md",
        ),
      ),
      "hardhat-toolbox-mocha-ethers skill should be installed",
    );

    if (process.platform === "win32") {
      assert.equal(
        await readUtf8File(path.join(process.cwd(), "CLAUDE.md")),
        "@AGENTS.md\n",
      );
      const dotClaudeStat = await fsPromises.lstat(
        path.join(process.cwd(), ".claude"),
      );
      assert.ok(
        dotClaudeStat.isDirectory(),
        ".claude should be a directory on windows",
      );
    } else {
      const claudeMdStat = await fsPromises.lstat(
        path.join(process.cwd(), "CLAUDE.md"),
      );
      assert.ok(
        claudeMdStat.isSymbolicLink(),
        "CLAUDE.md should be a symlink on unix",
      );
      const dotClaudeStat = await fsPromises.lstat(
        path.join(process.cwd(), ".claude"),
      );
      assert.ok(
        dotClaudeStat.isSymbolicLink(),
        ".claude should be a symlink on unix",
      );
    }
  });

  it("should install skills and create CLAUDE.md and .claude for the node-test-runner-viem template", async () => {
    const [template] = await getTemplate("hardhat-3", "node-test-runner-viem");
    await copyProjectFiles(process.cwd(), template, true);

    assert.ok(
      await exists(
        path.join(process.cwd(), ".agents", "skills", "hardhat", "SKILL.md"),
      ),
      "hardhat skill should be installed",
    );
    assert.ok(
      await exists(
        path.join(
          process.cwd(),
          ".agents",
          "skills",
          "hardhat-toolbox-viem",
          "SKILL.md",
        ),
      ),
      "hardhat-toolbox-viem skill should be installed",
    );

    if (process.platform === "win32") {
      assert.equal(
        await readUtf8File(path.join(process.cwd(), "CLAUDE.md")),
        "@AGENTS.md\n",
      );
      const dotClaudeStat = await fsPromises.lstat(
        path.join(process.cwd(), ".claude"),
      );
      assert.ok(
        dotClaudeStat.isDirectory(),
        ".claude should be a directory on windows",
      );
    } else {
      const claudeMdStat = await fsPromises.lstat(
        path.join(process.cwd(), "CLAUDE.md"),
      );
      assert.ok(
        claudeMdStat.isSymbolicLink(),
        "CLAUDE.md should be a symlink on unix",
      );
      const dotClaudeStat = await fsPromises.lstat(
        path.join(process.cwd(), ".claude"),
      );
      assert.ok(
        dotClaudeStat.isSymbolicLink(),
        ".claude should be a symlink on unix",
      );
    }
  });

  it("should not touch CLAUDE.md if it exists and force is false", async () => {
    const [template] = await getTemplate("hardhat-3", "mocha-ethers");
    const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");
    await writeUtf8File(claudeMdPath, "original");

    await copyProjectFiles(process.cwd(), template, false);

    assert.equal(await readUtf8File(claudeMdPath), "original");
  });

  it("should overwrite CLAUDE.md if force is true", async () => {
    const [template] = await getTemplate("hardhat-3", "mocha-ethers");
    const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");
    await writeUtf8File(claudeMdPath, "original");

    await copyProjectFiles(process.cwd(), template, true);

    if (process.platform === "win32") {
      assert.equal(await readUtf8File(claudeMdPath), "@AGENTS.md\n");
    } else {
      const stat = await fsPromises.lstat(claudeMdPath);
      assert.ok(stat.isSymbolicLink(), "CLAUDE.md should be a symlink on unix");
    }
  });

  it("should not touch .claude if it exists and force is false", async () => {
    const [template] = await getTemplate("hardhat-3", "mocha-ethers");
    const markerPath = path.join(process.cwd(), ".claude", "marker.txt");
    await ensureDir(path.join(process.cwd(), ".claude"));
    await writeUtf8File(markerPath, "original");

    await copyProjectFiles(process.cwd(), template, false);

    assert.equal(await readUtf8File(markerPath), "original");
  });

  it("should remove and re-create .claude if it exists and force is true", async () => {
    const [template] = await getTemplate("hardhat-3", "mocha-ethers");
    const markerPath = path.join(process.cwd(), ".claude", "marker.txt");
    await ensureDir(path.join(process.cwd(), ".claude"));
    await writeUtf8File(markerPath, "original");

    await copyProjectFiles(process.cwd(), template, true);

    assert.ok(
      !(await exists(markerPath)),
      ".claude/marker.txt should not exist after re-creation",
    );
  });
});

describe("installProjectDependencies", async () => {
  const tmp = createTmpDir("installProjectDependencies", "test");

  disableConsole();

  const templates = await getTemplates("hardhat-3");

  for (const template of templates) {
    // NOTE: This test is slow because it installs dependencies over the network.
    // It tests installation for all the templates, but only with the npm as the
    // package manager. We also support pnpm and yarn.
    it(
      `should install all the ${template.name} template dependencies in an empty project if the user opts-in to the installation`,
      {
        skip: skipNetworkSlowTests,
      },
      async () => {
        await writeUtf8File(
          path.join(tmp.path, "package.json"),
          JSON.stringify({ type: "module" }),
        );
        await setUpPnpmTmpDir(tmp.path);
        await installProjectDependencies({
          workspace: tmp.path,
          template,
          install: true,
          update: false,
        });
        assert.ok(
          await exists(path.join(tmp.path, "node_modules")),
          "node_modules should exist",
        );
        const dependencies = Object.keys(
          template.packageJson.devDependencies ?? {},
        );
        for (const dependency of dependencies) {
          const nodeModulesPath = path.join(
            tmp.path,
            "node_modules",
            ...dependency.split("/"),
          );
          assert.ok(
            await exists(nodeModulesPath),
            `${nodeModulesPath} should exist`,
          );
        }
      },
    );
  }

  it("should not install any template dependencies if the user opts-out of the installation", async () => {
    const [template] = await getTemplate("hardhat-3", "mocha-ethers");
    await writeUtf8File(
      path.join(tmp.path, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    await installProjectDependencies({
      workspace: tmp.path,
      template,
      install: false,
      update: false,
    });
    assert.ok(
      !(await exists(path.join(tmp.path, "node_modules"))),
      "node_modules should not exist",
    );
  });

  it(
    "should install any existing template dependencies that are out of date if the user opts-in to the update",
    {
      skip: skipNetworkSlowTests,
    },
    async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      await writeUtf8File(
        path.join(tmp.path, "package.json"),
        JSON.stringify({
          type: "module",
          devDependencies: { hardhat: "0.0.0" },
        }),
      );
      await setUpPnpmTmpDir(tmp.path);
      await installProjectDependencies({
        workspace: tmp.path,
        template,
        install: false,
        update: true,
      });
      assert.ok(
        await exists(path.join(tmp.path, "node_modules")),
        "node_modules should exist",
      );
      const dependencies = Object.keys(
        template.packageJson.devDependencies ?? {},
      );
      for (const dependency of dependencies) {
        const nodeModulesPath = path.join(
          tmp.path,
          "node_modules",
          ...dependency.split("/"),
        );
        if (dependency === "hardhat") {
          assert.ok(
            await exists(nodeModulesPath),
            `${nodeModulesPath} should exist`,
          );
        } else {
          assert.ok(
            !(await exists(nodeModulesPath)),
            `${nodeModulesPath} should not exist`,
          );
        }
      }
    },
  );

  it(
    "should not update dependencies if they are up-to-date and the user opts-in to the update (specific version)",
    {
      skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
    },
    async () => {
      const template: Template = {
        name: "test",
        packageJson: {
          name: "test",
          version: "0.0.1",
          devDependencies: { "fake-dependency": "^1.2.3" }, // <-- required version
        },
        path: tmp.path,
        files: [],
      };

      await writeUtf8File(
        path.join(tmp.path, "package.json"),
        JSON.stringify({
          type: "module",
          devDependencies: { "fake-dependency": "1.2.3" }, // <-- specific version
        }),
      );
      await installProjectDependencies({
        workspace: tmp.path,
        template,
        install: false,
        update: true,
      });

      assert.ok(
        !(await exists(path.join(tmp.path, "node_modules"))),
        "no modules should have been installed",
      );
    },
  );

  it(
    "should not update dependencies if they are up-to-date and the user opts-in to the update (version range)",
    {
      skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
    },
    async () => {
      const template: Template = {
        name: "test",
        packageJson: {
          name: "test",
          version: "0.0.1",
          devDependencies: { "fake-dependency": ">=1.2.3" }, // <-- required version
        },
        path: tmp.path,
        files: [],
      };

      await writeUtf8File(
        path.join(tmp.path, "package.json"),
        JSON.stringify({
          type: "module",
          devDependencies: { "fake-dependency": "^1.2.3" }, // <-- version range
        }),
      );
      await installProjectDependencies({
        workspace: tmp.path,
        template,
        install: false,
        update: true,
      });

      assert.ok(
        !(await exists(path.join(tmp.path, "node_modules"))),
        "no modules should have been installed",
      );
    },
  );

  describe(
    "when the package manager spawn fails",
    {
      skip:
        process.platform === "win32"
          ? "this test relies on a POSIX shell to override the package manager"
          : false,
    },
    () => {
      let originalPath: string | undefined;
      let originalUserAgent: string | undefined;

      beforeEach(async () => {
        // Put a fake `npm` that always exits non-zero first in PATH so the
        // installation spawn fails deterministically, without needing the
        // network or a real package manager.
        const fakeBinDir = path.join(tmp.path, "fake-bin");
        await ensureDir(fakeBinDir);
        const fakeNpmPath = path.join(fakeBinDir, "npm");
        await writeUtf8File(fakeNpmPath, "#!/bin/sh\nexit 1\n");
        await fsPromises.chmod(fakeNpmPath, 0o755);

        originalPath = process.env.PATH;
        originalUserAgent = process.env.npm_config_user_agent;
        process.env.PATH = `${fakeBinDir}${path.delimiter}${originalPath ?? ""}`;
        // Force the package manager detection to fall back to npm so the spawn
        // resolves to our stub.
        delete process.env.npm_config_user_agent;
      });

      afterEach(() => {
        if (originalPath === undefined) {
          delete process.env.PATH;
        } else {
          process.env.PATH = originalPath;
        }
        if (originalUserAgent !== undefined) {
          process.env.npm_config_user_agent = originalUserAgent;
        }
      });

      it("should wrap installation failures in a HardhatError", async () => {
        const [template] = await getTemplate("hardhat-3", "mocha-ethers");
        await writeUtf8File(
          path.join(tmp.path, "package.json"),
          JSON.stringify({ type: "module" }),
        );

        await assertRejectsWithHardhatError(
          installProjectDependencies({
            workspace: tmp.path,
            template,
            install: true,
            update: false,
          }),
          HardhatError.ERRORS.CORE.INIT.FAILED_TO_INSTALL_DEPENDENCIES,
          {},
        );
      });

      it("should wrap update failures in a HardhatError", async () => {
        const [template] = await getTemplate("hardhat-3", "mocha-ethers");
        await writeUtf8File(
          path.join(tmp.path, "package.json"),
          JSON.stringify({
            type: "module",
            devDependencies: { hardhat: "0.0.0" },
          }),
        );

        await assertRejectsWithHardhatError(
          installProjectDependencies({
            workspace: tmp.path,
            template,
            install: false,
            update: true,
          }),
          HardhatError.ERRORS.CORE.INIT.FAILED_TO_INSTALL_DEPENDENCIES,
          {},
        );
      });
    },
  );
});

describe("initHardhat", async () => {
  describe("templates", async () => {
    const tmp = createTmpDir("initHardhat-templates", "test");

    disableConsole();

    const templates = await getTemplates("hardhat-3");

    for (const template of templates) {
      // NOTE: This test uses network to access the npm registry
      it(
        `should initialize the project using the ${template.name} template in an empty folder`,
        {
          skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
        },
        async () => {
          await initHardhat({
            hardhatVersion: "hardhat-3",
            template: template.name,
            workspace: tmp.path,
            migrateToEsm: false,
            force: false,
            install: false,
          });
          assert.ok(
            await exists(path.join(tmp.path, "package.json")),
            "package.json should exist",
          );
          const workspaceFiles = template.files.map(
            relativeTemplateToWorkspacePath,
          );
          for (const file of workspaceFiles) {
            const pathToFile = path.join(tmp.path, file);
            assert.ok(await exists(pathToFile), `File ${file} should exist`);
          }
        },
      );
    }
  });

  describe("folder creation when non existent", async () => {
    const tmp = createTmpDir("initHardhat-folder-creation", "test");

    disableConsole();

    const template = (await getTemplates("hardhat-3"))[0];

    // Verifies that non-existent folders are created during initialization instead of throwing an error
    for (const folderPath of [
      "nonExistingFolder",
      path.join("nestedFolder", "nonExistingFolder"),
    ]) {
      // NOTE: This test uses network to access the npm registry
      it(
        `should initialize the project in a non existing folder with path "${folderPath}"`,
        {
          skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
        },
        async () => {
          const workspacePath = path.join(tmp.path, folderPath);

          await initHardhat({
            hardhatVersion: "hardhat-3",
            template: template.name,
            workspace: workspacePath,
            migrateToEsm: false,
            force: false,
            install: false,
          });
          assert.ok(
            await exists(path.join(workspacePath, "package.json")),
            "package.json should exist",
          );
          const workspaceFiles = template.files.map(
            relativeTemplateToWorkspacePath,
          );
          for (const file of workspaceFiles) {
            const pathToFile = path.join(workspacePath, file);
            assert.ok(await exists(pathToFile), `File ${file} should exist`);
          }
        },
      );
    }
  });
});

describe("shouldUpdateDependency", () => {
  const testCases = [
    {
      workspaceVersion: "1.0.0",
      templateVersion: "1.0.0",
      expectedResult: false,
    },
    {
      workspaceVersion: "1.0.0",
      templateVersion: "1.2.3",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.2.3",
      templateVersion: "1.0.0",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.2.3",
      templateVersion: "^1.2.3",
      expectedResult: false,
    },
    {
      workspaceVersion: "^1.2.3",
      templateVersion: "1.2.3",
      expectedResult: true,
    },
    {
      workspaceVersion: ">= 1.2.3",
      templateVersion: "^1.2.3",
      expectedResult: true,
    },
    {
      workspaceVersion: "^1.2.3",
      templateVersion: ">= 1.2.3",
      expectedResult: false,
    },
    {
      workspaceVersion: "1.0.0-dev",
      templateVersion: "1.0.0-dev",
      expectedResult: false,
    },
    {
      workspaceVersion: "1.0.0-dev",
      templateVersion: "1.2.3-dev",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.2.3-dev",
      templateVersion: "1.0.0-dev",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.2.3-dev",
      templateVersion: "^1.2.3-dev",
      expectedResult: false,
    },
    {
      workspaceVersion: "^1.2.3-dev",
      templateVersion: "1.2.3-dev",
      expectedResult: true,
    },
    {
      workspaceVersion: ">= 1.2.3-dev",
      templateVersion: "^1.2.3-dev",
      expectedResult: true,
    },
    {
      workspaceVersion: "^1.2.3-dev",
      templateVersion: ">= 1.2.3-dev",
      expectedResult: false,
    },
    {
      workspaceVersion: "1.0.0",
      templateVersion: "1.0.0-dev",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.0.0-dev",
      templateVersion: "1.0.0",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.0.0-dev",
      templateVersion: "1.2.3",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.0.0",
      templateVersion: "1.2.3-dev",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.2.3",
      templateVersion: "1.0.0-dev",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.2.3-dev",
      templateVersion: "1.0.0",
      expectedResult: true,
    },
    {
      workspaceVersion: "1.2.3",
      templateVersion: "^1.2.3-dev",
      expectedResult: false,
    },
    {
      workspaceVersion: "1.2.3-dev",
      templateVersion: "^1.2.3",
      expectedResult: true,
    },
    {
      workspaceVersion: "^1.2.3",
      templateVersion: "1.2.3-dev",
      expectedResult: true,
    },
    {
      workspaceVersion: "^1.2.3-dev",
      templateVersion: "1.2.3",
      expectedResult: true,
    },
    {
      workspaceVersion: ">= 1.2.3",
      templateVersion: "^1.2.3-dev",
      expectedResult: true,
    },
    {
      workspaceVersion: ">= 1.2.3-dev",
      templateVersion: "^1.2.3",
      expectedResult: true,
    },
    {
      workspaceVersion: "^1.2.3",
      templateVersion: ">= 1.2.3-dev",
      expectedResult: false,
    },
    {
      workspaceVersion: "^1.2.3-dev",
      templateVersion: ">= 1.2.3",
      expectedResult: true,
    },
    {
      workspaceVersion: "3.0.0-next.0",
      templateVersion: "^3.0.0-next.0",
      expectedResult: false,
    },
  ];

  for (const {
    workspaceVersion,
    templateVersion,
    expectedResult,
  } of testCases) {
    it(`should return ${expectedResult} when workspace version is ${workspaceVersion} and template version is ${templateVersion}`, () => {
      assert.equal(
        shouldUpdateDependency(workspaceVersion, templateVersion),
        expectedResult,
      );
    });
  }
});

describe("initHardhat3NonInteractive", async () => {
  describe("templates", async () => {
    const tmp = useTmpDirAsCwd("initHardhat3NonInteractiveTemplates");

    disableConsole();

    const templates = await getTemplates("hardhat-3");

    for (const template of templates) {
      // NOTE: This test uses network to access the npm registry
      it(
        `should initialize the project using the ${template.name} template in an empty folder`,
        {
          skip: skipNetworkSlowTests,
        },
        async () => {
          await setUpPnpmTmpDir(tmp.path);
          await initHardhat3NonInteractive({ template: template.name });
          assert.ok(await exists("package.json"), "package.json should exist");
          const pkg: PackageJson = await readJsonFile(
            path.join(process.cwd(), "package.json"),
          );
          assert.equal(pkg.type, "module");
          const workspaceFiles = template.files.map(
            relativeTemplateToWorkspacePath,
          );
          for (const file of workspaceFiles) {
            const pathToFile = path.join(process.cwd(), file);
            assert.ok(await exists(pathToFile), `File ${file} should exist`);
          }
          assert.ok(
            !(await exists("HARDHAT.md")),
            "HARDHAT.md should not exist when there was no pre-existing README.md",
          );
        },
      );
    }
  });

  describe("unknown template", () => {
    useTmpDirAsCwd("initHardhat3NonInteractiveUnknownTemplate");

    it("should throw with the list of available templates", async () => {
      const templates = await getTemplates("hardhat-3");
      const availableTemplates = templates
        .map((t) => `  - ${t.name}`)
        .join("\n");

      await assertRejectsWithHardhatError(
        async () =>
          await initHardhat3NonInteractive({ template: "non-existent" }),
        HardhatError.ERRORS.CORE.GENERAL
          .TEMPLATE_NOT_FOUND_WITH_LIST_OF_OPTIONS,
        {
          template: "non-existent",
          availableTemplates,
        },
      );
    });
  });

  describe("overwrite protection", () => {
    useTmpDirAsCwd("initHardhat3NonInteractiveOverwrite");

    disableConsole();

    it("should refuse to overwrite a pre-existing template file", async () => {
      await writeUtf8File("tsconfig.json", "pre-existing");

      await assertRejectsWithHardhatError(
        async () =>
          await initHardhat3NonInteractive({ template: "mocha-ethers" }),
        HardhatError.ERRORS.CORE.GENERAL
          .NON_INTERACTIVE_INIT_WOULD_OVERWRITE_FILES,
        {
          files: "  - tsconfig.json",
        },
      );

      assert.equal(
        await readUtf8File("tsconfig.json"),
        "pre-existing",
        "tsconfig.json should not have been modified",
      );
    });

    it("should reject when the workspace is already a Hardhat project", async () => {
      await writeUtf8File("hardhat.config.js", "");

      await assertRejectsWithHardhatError(
        async () =>
          await initHardhat3NonInteractive({ template: "mocha-ethers" }),
        HardhatError.ERRORS.CORE.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
        {
          hardhatProjectRootPath: path.join(process.cwd(), "hardhat.config.js"),
        },
      );
    });
  });

  describe("exceptions to overwrite protection", () => {
    const tmp = useTmpDirAsCwd("initHardhat3NonInteractiveExceptions");

    disableConsole();

    it(
      "should allow a pre-existing package.json and preserve its extra keys",
      {
        skip: skipNetworkSlowTests,
      },
      async () => {
        await writeJsonFile("package.json", {
          name: "user-chosen-name",
          type: "module",
        });
        await setUpPnpmTmpDir(tmp.path);

        await initHardhat3NonInteractive({ template: "mocha-ethers" });

        const pkg: PackageJson = await readJsonFile(
          path.join(process.cwd(), "package.json"),
        );
        assert.equal(pkg.name, "user-chosen-name");
        assert.equal(pkg.type, "module");
      },
    );

    it(
      "should preserve a pre-existing .gitignore",
      {
        skip: skipNetworkSlowTests,
      },
      async () => {
        await writeUtf8File(".gitignore", "user-gitignore-marker");
        await setUpPnpmTmpDir(tmp.path);

        await initHardhat3NonInteractive({ template: "mocha-ethers" });

        assert.equal(
          await readUtf8File(".gitignore"),
          "user-gitignore-marker",
          ".gitignore should not have been overwritten",
        );
      },
    );

    it(
      "should redirect the template README.md to HARDHAT.md when README.md exists",
      {
        skip: skipNetworkSlowTests,
      },
      async () => {
        await writeUtf8File("README.md", "user readme");
        await setUpPnpmTmpDir(tmp.path);

        const [template] = await getTemplate("hardhat-3", "mocha-ethers");
        const templateReadme = await readUtf8File(
          path.join(template.path, "README.md"),
        );

        await initHardhat3NonInteractive({ template: "mocha-ethers" });

        assert.equal(await readUtf8File("README.md"), "user readme");
        assert.ok(await exists("HARDHAT.md"), "HARDHAT.md should exist");
        assert.equal(await readUtf8File("HARDHAT.md"), templateReadme);
      },
    );

    it(
      "should preserve both README.md and HARDHAT.md when both pre-exist",
      {
        skip: skipNetworkSlowTests,
      },
      async () => {
        await writeUtf8File("README.md", "user readme");
        await writeUtf8File("HARDHAT.md", "user hardhat md");
        await setUpPnpmTmpDir(tmp.path);

        await initHardhat3NonInteractive({ template: "mocha-ethers" });

        assert.equal(await readUtf8File("README.md"), "user readme");
        assert.equal(await readUtf8File("HARDHAT.md"), "user hardhat md");
      },
    );
  });

  describe("progress output", () => {
    const tmp = useTmpDirAsCwd("initHardhat3NonInteractiveOutput");

    it(
      "should print the progress sequence on success",
      {
        skip: skipNetworkSlowTests,
      },
      async () => {
        await setUpPnpmTmpDir(tmp.path);

        const logLines: string[] = [];
        const originalLog = console.log;
        console.log = (...args: unknown[]) => {
          logLines.push(args.map((a) => String(a)).join(" "));
        };

        try {
          await initHardhat3NonInteractive({ template: "mocha-ethers" });
        } finally {
          console.log = originalLog;
        }

        assert.equal(logLines[0], "Initializing project...");
        const installingIdx = logLines.indexOf("Installing dependencies...");
        assert.ok(
          installingIdx > 0,
          "should have 'Installing dependencies...' after the initial line",
        );
        assert.equal(logLines[logLines.length - 1], "Project initialized");
      },
    );
  });
});

describe("assertNoNonInteractiveClashes / copyProjectFilesNonInteractive", () => {
  const tmp = createTmpDir("copyProjectFilesNonInteractive", "test");

  async function buildFixtureTemplate(): Promise<Template> {
    const templateDir = path.join(tmp.path, "__template_fixture__");
    await ensureDir(templateDir);
    await writeUtf8File(
      path.join(templateDir, "hardhat.config.ts"),
      "template-hardhat-config",
    );
    await writeUtf8File(path.join(templateDir, "README.md"), "template-readme");
    await writeUtf8File(
      path.join(templateDir, "gitignore"),
      "template-gitignore",
    );

    return {
      name: "fixture",
      packageJson: { name: "fixture", version: "0.0.1", type: "module" },
      path: templateDir,
      files: ["hardhat.config.ts", "README.md", "gitignore"],
    };
  }

  it("should copy all files in an empty workspace", async () => {
    const template = await buildFixtureTemplate();
    const workspace = path.join(tmp.path, "workspace");
    await ensureDir(workspace);

    await assertNoNonInteractiveClashes(workspace, template);
    await copyProjectFilesNonInteractive(workspace, template);

    assert.equal(
      await readUtf8File(path.join(workspace, "hardhat.config.ts")),
      "template-hardhat-config",
    );
    assert.equal(
      await readUtf8File(path.join(workspace, "README.md")),
      "template-readme",
    );
    assert.equal(
      await readUtf8File(path.join(workspace, ".gitignore")),
      "template-gitignore",
    );
    assert.ok(
      !(await exists(path.join(workspace, "HARDHAT.md"))),
      "HARDHAT.md should not exist",
    );
  });

  it("should preserve a pre-existing .gitignore", async () => {
    const template = await buildFixtureTemplate();
    const workspace = path.join(tmp.path, "workspace-gitignore");
    await ensureDir(workspace);
    await writeUtf8File(path.join(workspace, ".gitignore"), "user-gitignore");

    await assertNoNonInteractiveClashes(workspace, template);
    await copyProjectFilesNonInteractive(workspace, template);

    assert.equal(
      await readUtf8File(path.join(workspace, ".gitignore")),
      "user-gitignore",
    );
  });

  it("should redirect README.md to HARDHAT.md when README.md pre-exists", async () => {
    const template = await buildFixtureTemplate();
    const workspace = path.join(tmp.path, "workspace-readme");
    await ensureDir(workspace);
    await writeUtf8File(path.join(workspace, "README.md"), "user-readme");

    await assertNoNonInteractiveClashes(workspace, template);
    await copyProjectFilesNonInteractive(workspace, template);

    assert.equal(
      await readUtf8File(path.join(workspace, "README.md")),
      "user-readme",
    );
    assert.equal(
      await readUtf8File(path.join(workspace, "HARDHAT.md")),
      "template-readme",
    );
  });

  it("should skip README copy when both README.md and HARDHAT.md pre-exist", async () => {
    const template = await buildFixtureTemplate();
    const workspace = path.join(tmp.path, "workspace-both");
    await ensureDir(workspace);
    await writeUtf8File(path.join(workspace, "README.md"), "user-readme");
    await writeUtf8File(path.join(workspace, "HARDHAT.md"), "user-hardhat-md");

    await assertNoNonInteractiveClashes(workspace, template);
    await copyProjectFilesNonInteractive(workspace, template);

    assert.equal(
      await readUtf8File(path.join(workspace, "README.md")),
      "user-readme",
    );
    assert.equal(
      await readUtf8File(path.join(workspace, "HARDHAT.md")),
      "user-hardhat-md",
    );
  });

  it("should throw a clash error for a pre-existing non-exempt file", async () => {
    const template = await buildFixtureTemplate();
    const workspace = path.join(tmp.path, "workspace-clash");
    await ensureDir(workspace);
    await writeUtf8File(
      path.join(workspace, "hardhat.config.ts"),
      "user-config",
    );

    await assertRejectsWithHardhatError(
      async () => await assertNoNonInteractiveClashes(workspace, template),
      HardhatError.ERRORS.CORE.GENERAL
        .NON_INTERACTIVE_INIT_WOULD_OVERWRITE_FILES,
      {
        files: "  - hardhat.config.ts",
      },
    );
  });
});
