import type { Template } from "../../../../src/internal/cli/init/template.js";
import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import assert from "node:assert/strict";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { describe, it, mock } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
  assertRejectsWithHardhatError,
  disableConsole,
  useTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import {
  ensureDir,
  exists,
  createFile,
  readJsonFile,
  readUtf8File,
  remove,
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

// NOTE: This uses network to access the npm registry
describe("printWelcomeMessage", () => {
  disableConsole();

  it("should not throw if latest version of hardhat cannot be retrieved from the registry", async () => {
    await printWelcomeMessage();
  });
});

describe("getWorkspace", () => {
  useTmpDir("getWorkspace");

  describe("workspace is not a directory", async () => {
    useTmpDir("invalidDirectory");

    it("should throw if the provided workspace is not a directory", async () => {
      const filePath = path.join(process.cwd(), "file.txt");

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
    await ensureDir("hardhat-project");
    await writeUtf8File("hardhat.config.ts", "");
    await assertRejectsWithHardhatError(
      async () => await getWorkspace("hardhat-project"),
      HardhatError.ERRORS.CORE.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
      {
        hardhatProjectRootPath: path.join(process.cwd(), "hardhat.config.ts"),
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
  useTmpDir("validatePackageJson");

  it("should create the package.json file if it does not exist", async () => {
    assert.ok(
      !(await exists("package.json")),
      "package.json should not exist before ensuring it exists",
    );

    await validatePackageJson(
      process.cwd(),
      {
        name: "package-name",
        version: "0.0.1",
        type: "module",
      },
      false,
    );

    assert.ok(await exists("package.json"), "package.json should exist");
  });

  it("should not create the package.json file if it already exists", async () => {
    const before = {
      name: "a unique name that ensureProjectPackageJson definitely does not set",
      type: "module",
    };

    await writeJsonFile("package.json", before);

    await validatePackageJson(
      process.cwd(),
      {
        name: "package-name",
        version: "0.0.1",
        type: "module",
      },
      false,
    );

    const after = await readJsonFile("package.json");

    assert.deepEqual(before, after);
  });

  it("should throw if the package.json is not for an esm package", async () => {
    await writeJsonFile("package.json", {});

    await assertRejectsWithHardhatError(
      async () =>
        await validatePackageJson(
          process.cwd(),
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
    await writeJsonFile("package.json", {});

    await validatePackageJson(
      process.cwd(),
      {
        name: "package-name",
        version: "0.0.1",
        type: "module",
      },
      true,
    );

    const pkg: PackageJson = await readJsonFile(
      path.join(process.cwd(), "package.json"),
    );

    assert.equal(pkg.type, "module");
  });

  it("should not migrate package.json to esm when shouldUseEsm is false and type is not set", async () => {
    await writeJsonFile("package.json", {});

    await validatePackageJson(
      process.cwd(),
      {
        name: "package-name",
        version: "0.0.1",
      },
      false,
    );

    const pkg: PackageJson = await readJsonFile(
      path.join(process.cwd(), "package.json"),
    );

    assert.equal(pkg.type, undefined);
  });

  it("should not migrate package.json to esm when shouldUseEsm is false and type is commonjs", async () => {
    const before = {
      name: "a unique name that ensureProjectPackageJson definitely does not set",
      type: "commonjs",
    };

    await writeJsonFile("package.json", before);

    await validatePackageJson(
      process.cwd(),
      {
        name: "package-name",
        version: "0.0.1",
      },
      false,
    );

    const after: PackageJson = await readJsonFile(
      path.join(process.cwd(), "package.json"),
    );

    assert.deepEqual(before, after);
  });

  it("should not migrate package.json to esm when shouldUseEsm is false and no package.json exists", async () => {
    await remove(path.join(process.cwd(), "package.json"));

    assert.ok(
      !(await exists("package.json")),
      "package.json should not exist before ensuring it exists",
    );

    await validatePackageJson(
      process.cwd(),
      {
        name: "package-name",
        version: "0.0.1",
      },
      false,
    );

    const after: PackageJson = await readJsonFile(
      path.join(process.cwd(), "package.json"),
    );

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
  useTmpDir("copyProjectFiles");

  disableConsole();

  describe("when force is true", () => {
    it("should copy the template files to the workspace and overwrite existing files", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      // Create template files with "some content" in the workspace
      const workspaceFiles = template.files.map(
        relativeTemplateToWorkspacePath,
      );
      for (const file of workspaceFiles) {
        const pathToFile = path.join(process.cwd(), file);
        await ensureDir(path.dirname(pathToFile));
        await writeUtf8File(pathToFile, "some content");
      }
      // Copy the template files to the workspace
      await copyProjectFiles(process.cwd(), template, true);
      // Check that the template files in the workspace have been overwritten
      for (const file of workspaceFiles) {
        const pathToFile = path.join(process.cwd(), file);
        assert.notEqual(await readUtf8File(pathToFile), "some content");
      }
    });
    it("should copy the .gitignore file correctly", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      // Copy the template files to the workspace
      await copyProjectFiles(process.cwd(), template, true);
      // Check that the .gitignore exists but gitignore does not
      assert.ok(
        await exists(path.join(process.cwd(), ".gitignore")),
        ".gitignore should exist",
      );
      assert.ok(
        !(await exists(path.join(process.cwd(), "gitignore"))),
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
        const pathToFile = path.join(process.cwd(), file);
        await ensureDir(path.dirname(pathToFile));
        await writeUtf8File(pathToFile, "some content");
      }
      // Copy the template files to the workspace
      await copyProjectFiles(process.cwd(), template, false);
      // Check that the template files in the workspace have not been overwritten
      for (const file of workspaceFiles) {
        const pathToFile = path.join(process.cwd(), file);
        assert.equal(await readUtf8File(pathToFile), "some content");
      }
    });
    it("should copy the .gitignore file correctly", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      // Copy the template files to the workspace
      await copyProjectFiles(process.cwd(), template, false);
      // Check that the .gitignore exists but gitignore does not
      assert.ok(
        await exists(path.join(process.cwd(), ".gitignore")),
        ".gitignore should exist",
      );
      assert.ok(
        !(await exists(path.join(process.cwd(), "gitignore"))),
        "gitignore should NOT exist",
      );
    });

    it("Regression test: should not scan unrelated workspace files to detect overwrites", async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      const unrelatedDirPath = path.join(process.cwd(), "unrelated");
      const unrelatedFilePath = path.join(unrelatedDirPath, "ignored.txt");
      await ensureDir(unrelatedDirPath);
      await createFile(unrelatedFilePath);

      const originalReaddir = fsPromises.readdir;
      const readdirMock = mock.method(
        fsPromises,
        "readdir",
        async (...args: Parameters<typeof originalReaddir>) => {
          if (args[0] === process.cwd() && args[1]?.withFileTypes === true) {
            throw new Error(
              "copyProjectFiles should not scan the workspace recursively",
            );
          }

          return await Reflect.apply(originalReaddir, fsPromises, args);
        },
      );

      try {
        await copyProjectFiles(process.cwd(), template, false);

        const oneCopiedTemplateFile = path.join(
          process.cwd(),
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
      const pathWithDirectoryClash = path.join(
        process.cwd(),
        "hardhat.config.ts",
      );

      await ensureDir(pathWithDirectoryClash);

      await assertRejects(
        copyProjectFiles(process.cwd(), template, false),
        (error) => error.name === "IsDirectoryError",
        "expected copyProjectFiles to reject with IsDirectoryError",
      );
    });
  });
});

describe("installProjectDependencies", async () => {
  useTmpDir("installProjectDependencies");

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
        await writeUtf8File("package.json", JSON.stringify({ type: "module" }));
        // NOTE: Because we run tests under `pnpm`, the config setting in
        // the root `./npmrc` file make it to the subprocesses.
        // Unfortunately the `minimum-release-age-exclude` because it is an
        // array can get lost.
        // We explicitly add the `minimum-release-age-exclude` in as a
        // `.npmrc` file in the temporary folder to re-introduce this exclude.
        await writeUtf8File(
          ".npmrc",
          'minimum-release-age-exclude[]="hardhat"\nminimum-release-age-exclude[]="@nomicfoundation/*"',
        );
        await installProjectDependencies({
          workspace: process.cwd(),
          template,
          install: true,
          update: false,
        });
        assert.ok(await exists("node_modules"), "node_modules should exist");
        const dependencies = Object.keys(
          template.packageJson.devDependencies ?? {},
        );
        for (const dependency of dependencies) {
          const nodeModulesPath = path.join(
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
    await writeUtf8File("package.json", JSON.stringify({ type: "module" }));
    await installProjectDependencies({
      workspace: process.cwd(),
      template,
      install: false,
      update: false,
    });
    assert.ok(!(await exists("node_modules")), "node_modules should not exist");
  });

  it(
    "should install any existing template dependencies that are out of date if the user opts-in to the update",
    {
      skip: skipNetworkSlowTests,
    },
    async () => {
      const [template] = await getTemplate("hardhat-3", "mocha-ethers");
      await writeUtf8File(
        "package.json",
        JSON.stringify({
          type: "module",
          devDependencies: { hardhat: "0.0.0" },
        }),
      );
      // NOTE: See related explanation in the `should install all the ${template.name} ...` test
      await writeUtf8File(
        ".npmrc",
        'minimum-release-age-exclude[]="hardhat"\nminimum-release-age-exclude[]="@nomicfoundation/*"',
      );
      await installProjectDependencies({
        workspace: process.cwd(),
        template,
        install: false,
        update: true,
      });
      assert.ok(await exists("node_modules"), "node_modules should exist");
      const dependencies = Object.keys(
        template.packageJson.devDependencies ?? {},
      );
      for (const dependency of dependencies) {
        const nodeModulesPath = path.join(
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
        path: process.cwd(),
        files: [],
      };

      await writeUtf8File(
        "package.json",
        JSON.stringify({
          type: "module",
          devDependencies: { "fake-dependency": "1.2.3" }, // <-- specific version
        }),
      );
      await installProjectDependencies({
        workspace: process.cwd(),
        template,
        install: false,
        update: true,
      });

      assert.ok(
        !(await exists("node_modules")),
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
        path: process.cwd(),
        files: [],
      };

      await writeUtf8File(
        "package.json",
        JSON.stringify({
          type: "module",
          devDependencies: { "fake-dependency": "^1.2.3" }, // <-- version range
        }),
      );
      await installProjectDependencies({
        workspace: process.cwd(),
        template,
        install: false,
        update: true,
      });

      assert.ok(
        !(await exists("node_modules")),
        "no modules should have been installed",
      );
    },
  );
});

describe("initHardhat", async () => {
  describe("templates", async () => {
    useTmpDir("initHardhat");

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
            workspace: process.cwd(),
            migrateToEsm: false,
            force: false,
            install: false,
          });
          assert.ok(await exists("package.json"), "package.json should exist");
          const workspaceFiles = template.files.map(
            relativeTemplateToWorkspacePath,
          );
          for (const file of workspaceFiles) {
            const pathToFile = path.join(process.cwd(), file);
            assert.ok(await exists(pathToFile), `File ${file} should exist`);
          }
        },
      );
    }
  });

  describe("folder creation when non existent", async () => {
    useTmpDir("initHardhat");

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
          const workspacePath = path.join(process.cwd(), folderPath);

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
    useTmpDir("initHardhat3NonInteractiveTemplates");

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
          await writeUtf8File(
            ".npmrc",
            'minimum-release-age-exclude[]="hardhat"\nminimum-release-age-exclude[]="@nomicfoundation/*"',
          );
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
    useTmpDir("initHardhat3NonInteractiveUnknownTemplate");

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
    useTmpDir("initHardhat3NonInteractiveOverwrite");

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
    useTmpDir("initHardhat3NonInteractiveExceptions");

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
        await writeUtf8File(
          ".npmrc",
          'minimum-release-age-exclude[]="hardhat"\nminimum-release-age-exclude[]="@nomicfoundation/*"',
        );

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
        await writeUtf8File(
          ".npmrc",
          'minimum-release-age-exclude[]="hardhat"\nminimum-release-age-exclude[]="@nomicfoundation/*"',
        );

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
        await writeUtf8File(
          ".npmrc",
          'minimum-release-age-exclude[]="hardhat"\nminimum-release-age-exclude[]="@nomicfoundation/*"',
        );

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
        await writeUtf8File(
          ".npmrc",
          'minimum-release-age-exclude[]="hardhat"\nminimum-release-age-exclude[]="@nomicfoundation/*"',
        );

        await initHardhat3NonInteractive({ template: "mocha-ethers" });

        assert.equal(await readUtf8File("README.md"), "user readme");
        assert.equal(await readUtf8File("HARDHAT.md"), "user hardhat md");
      },
    );
  });

  describe("progress output", () => {
    useTmpDir("initHardhat3NonInteractiveOutput");

    it(
      "should print the progress sequence on success",
      {
        skip: skipNetworkSlowTests,
      },
      async () => {
        await writeUtf8File(
          ".npmrc",
          'minimum-release-age-exclude[]="hardhat"\nminimum-release-age-exclude[]="@nomicfoundation/*"',
        );

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
  useTmpDir("copyProjectFilesNonInteractive");

  async function buildFixtureTemplate(): Promise<Template> {
    const templateDir = path.join(process.cwd(), "__template_fixture__");
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
    const workspace = path.join(process.cwd(), "workspace");
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
    const workspace = path.join(process.cwd(), "workspace-gitignore");
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
    const workspace = path.join(process.cwd(), "workspace-readme");
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
    const workspace = path.join(process.cwd(), "workspace-both");
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
    const workspace = path.join(process.cwd(), "workspace-clash");
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
