import type { Template } from "../../../../src/internal/cli/init/template.js";
import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  disableConsole,
  useTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import {
  ensureDir,
  exists,
  readJsonFile,
  readUtf8File,
  remove,
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

import {
  copyProjectFiles,
  validatePackageJson,
  getTemplate,
  getWorkspace,
  initHardhat,
  installProjectDependencies,
  printWelcomeMessage,
  relativeTemplateToWorkspacePath,
  relativeWorkspaceToTemplatePath,
  shouldUpdateDependency,
} from "../../../../src/internal/cli/init/init.js";
import { getTemplates } from "../../../../src/internal/cli/init/template.js";

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
        async () => getWorkspace(filePath),
        HardhatError.ERRORS.CORE.GENERAL.WORKSPACE_MUST_BE_A_DIRECTORY,
        {
          workspace: path.resolve(filePath),
        },
      );
    });
  });

  it("should throw if the provided workspace is within an already initlized hardhat project", async () => {
    await ensureDir("hardhat-project");
    await writeUtf8File("hardhat.config.ts", "");
    await assertRejectsWithHardhatError(
      async () => getWorkspace("hardhat-project"),
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
      async () => getTemplate("hardhat-3", "non-existent-template"),
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
        validatePackageJson(
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
        skip:
          process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" ||
          process.env.GITHUB_EVENT_NAME === "push" || // TODO: This check should be limited to push events associated with a release PR merge
          process.env.GITHUB_EVENT_NAME === "merge_group" || // TODO: This check should be limited to merge_group events associated with a release PR merge
          process.env.GITHUB_HEAD_REF === "chore/remove-pre-release-config" || // TODO: remove this line after release
          process.env.GITHUB_HEAD_REF?.startsWith("changeset-release/"),
      },
      async () => {
        await writeUtf8File("package.json", JSON.stringify({ type: "module" }));
        await installProjectDependencies(process.cwd(), template, true, false);
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
    await installProjectDependencies(process.cwd(), template, false, false);
    assert.ok(!(await exists("node_modules")), "node_modules should not exist");
  });

  it(
    "should install any existing template dependencies that are out of date if the user opts-in to the update",
    {
      skip:
        process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" ||
        process.env.GITHUB_EVENT_NAME === "push" || // TODO: This check should be limited to push events associated with a release PR merge
        process.env.GITHUB_EVENT_NAME === "merge_group" || // TODO: This check should be limited to merge_group events associated with a release PR merge
        process.env.GITHUB_HEAD_REF?.startsWith("changeset-release/"),
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
      await installProjectDependencies(process.cwd(), template, false, true);
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
      await installProjectDependencies(process.cwd(), template, false, true);

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
      await installProjectDependencies(process.cwd(), template, false, true);

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
