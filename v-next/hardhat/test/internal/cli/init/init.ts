import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  ensureDir,
  exists,
  readUtf8File,
  writeUtf8File,
} from "@ignored/hardhat-vnext-utils/fs";
import {
  assertRejectsWithHardhatError,
  useTmpDir,
} from "@nomicfoundation/hardhat-test-utils";

import {
  copyProjectFiles,
  ensureProjectPackageJson,
  getTemplate,
  getWorkspace,
  initHardhat,
  installProjectDependencies,
  printWelcomeMessage,
} from "../../../../src/internal/cli/init/init.js";
import { getTemplates } from "../../../../src/internal/cli/init/template.js";

function disableConsoleLog() {
  const originalLog = console.log;

  before(() => {
    console.log = () => {};
  });

  after(() => {
    console.log = originalLog;
  });
}

// NOTE: This uses network to access the npm registry
describe("printWelcomeMessage", () => {
  disableConsoleLog();

  it("should not throw if latest version of hardhat cannot be retrieved from the registry", async () => {
    await printWelcomeMessage();
  });
});

describe("getWorkspace", () => {
  useTmpDir("getWorkspace");

  it("should throw if the provided workspace does not exist", async () => {
    // TODO: We shouldn't be testing the exact error message
    await assertRejectsWithHardhatError(
      async () => getWorkspace("non-existent-workspace"),
      HardhatError.ERRORS.GENERAL.WORKSPACE_NOT_FOUND,
      {
        workspace: path.resolve("non-existent-workspace"),
      },
    );
  });
  it("should throw if the provided workspace is within an already initlized hardhat project", async () => {
    await ensureDir("hardhat-project");
    await writeUtf8File("hardhat.config.ts", "");
    await assertRejectsWithHardhatError(
      async () => getWorkspace("hardhat-project"),
      HardhatError.ERRORS.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
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
      async () => getTemplate("non-existent-template"),
      HardhatError.ERRORS.GENERAL.TEMPLATE_NOT_FOUND,
      {
        template: "non-existent-template",
      },
    );
  });
  it("should return the provided template", async () => {
    const template = await getTemplate("empty-typescript");
    assert.equal(template.name, "empty-typescript");
  });
});

describe("ensureProjectPackageJson", () => {
  useTmpDir("ensureProjectPackageJson");

  it("should create the package.json file if it does not exist", async () => {
    assert.ok(
      !(await exists("package.json")),
      "package.json should not exist before ensuring it exists",
    );
    await ensureProjectPackageJson(process.cwd());
    assert.ok(await exists("package.json"), "package.json should exist");
  });
  it("should not create the package.json file if it already exists", async () => {
    const before = JSON.stringify({
      name: "a unique name that ensureProjectPackageJson definitely does not set",
      type: "module",
    });
    await writeUtf8File("package.json", before);
    await ensureProjectPackageJson(process.cwd());
    const after = await readUtf8File("package.json");
    assert.equal(before, after);
  });
  it("should throw if the package.json is not for an esm package", async () => {
    await writeUtf8File("package.json", "{}");
    await assertRejectsWithHardhatError(
      async () => ensureProjectPackageJson(process.cwd()),
      HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED,
      {},
    );
  });
});

describe("copyProjectFiles", () => {
  useTmpDir("copyProjectFiles");

  describe("when force is true", () => {
    it("should copy the template files to the workspace and overwrite existing files", async () => {
      const template = await getTemplate("empty-typescript");
      // Create template files with "some content" in the workspace
      for (const file of template.files) {
        const pathToFile = path.join(process.cwd(), file);
        ensureDir(path.dirname(pathToFile));
        await writeUtf8File(pathToFile, "some content");
      }
      // Copy the template files to the workspace
      await copyProjectFiles(process.cwd(), template, true);
      // Check that the template files in the workspace have been overwritten
      for (const file of template.files) {
        const pathToFile = path.join(process.cwd(), file);
        assert.notEqual(await readUtf8File(pathToFile), "some content");
      }
    });
  });
  describe("when force is false", () => {
    it("should copy the template files to the workspace and NOT overwrite existing files", async () => {
      const template = await getTemplate("empty-typescript");
      // Create template files with "some content" in the workspace
      for (const file of template.files) {
        const pathToFile = path.join(process.cwd(), file);
        ensureDir(path.dirname(pathToFile));
        await writeUtf8File(pathToFile, "some content");
      }
      // Copy the template files to the workspace
      await copyProjectFiles(process.cwd(), template, false);
      // Check that the template files in the workspace have not been overwritten
      for (const file of template.files) {
        const pathToFile = path.join(process.cwd(), file);
        assert.equal(await readUtf8File(pathToFile), "some content");
      }
    });
  });
});

describe("installProjectDependencies", () => {
  useTmpDir("installProjectDependencies");

  disableConsoleLog();

  describe("when install is true", () => {
    // This test is skipped because installing dependencies over the network is slow
    it.skip("should install the project dependencies", async () => {
      const template = await getTemplate("empty-typescript");
      await writeUtf8File("package.json", JSON.stringify({ type: "module" }));
      await installProjectDependencies(process.cwd(), template, true);
      assert.ok(await exists("node_modules"), "node_modules should exist");
    });
  });
  describe("when install is false", () => {
    it("should not install the project dependencies", async () => {
      const template = await getTemplate("empty-typescript");
      await writeUtf8File("package.json", JSON.stringify({ type: "module" }));
      await installProjectDependencies(process.cwd(), template, false);
      assert.ok(
        !(await exists("node_modules")),
        "node_modules should not exist",
      );
    });
  });
});

// NOTE: This uses network to access the npm registry
describe("initHardhat", async () => {
  useTmpDir("initHardhat");

  disableConsoleLog();

  const templates = await getTemplates();

  for (const template of templates) {
    it(`should initialize the project using the ${template.name} template in an empty folder`, async () => {
      await initHardhat({
        template: template.name,
        workspace: process.cwd(),
        force: false,
        install: false,
      });
      assert.ok(await exists("package.json"), "package.json should exist");
      for (const file of template.files) {
        const pathToFile = path.join(process.cwd(), file);
        assert.ok(await exists(pathToFile), `File ${file} should exist`);
      }
    });
  }
});
