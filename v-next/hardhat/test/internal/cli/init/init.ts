import { describe, it } from "node:test";

import { getTemplates } from "../../../../src/internal/cli/init/template.js";

describe("printWelcomeMessage", () => {
  it.todo(
    "should not throw if latest version of hardhat cannot be retrieved from the registry",
  );
});

describe("getWorkspace", () => {
  it.todo("should throw if the provided workspace does not exist");
  it.todo(
    "should throw if the provided workspace is within an already initlized hardhat project",
  );
  it.todo("should return the provided workspace");
});

describe("getTemplate", () => {
  it.todo("should throw if the provided template does not exist");
  it.todo("should return the provided template");
});

describe("ensureProjectPackageJson", () => {
  it.todo("should create the package.json file if it does not exist");
  it.todo("should not create the package.json file if it already exists");
  it.todo("should throw if the package.json is not for an esm package");
});

describe("copyProjectFiles", () => {
  describe("when force is true", () => {
    it.todo(
      "should copy the template files to the workspace while overwriting existing files",
    );
  });
  describe("when force is false", () => {
    it.todo(
      "should copy the template files to the workspace while skipping existing files",
    );
  });
});

describe("installProjectDependencies", () => {
  describe("when install is true", () => {
    it.todo("should install the project dependencies");
  });
  describe("when install is false", () => {
    it.todo("should not install the project dependencies");
  });
});

describe("initHardhat", async () => {
  const templates = await getTemplates();

  for (const template of templates) {
    it.todo(
      `should initialize the project using the ${template.name} template in an empty folder`,
    );
  }
});
