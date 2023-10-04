/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { loadModule } from "../src/load-module";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("loadModule", function () {
  useEphemeralIgnitionProject("user-modules");

  it("should return the module given the module name", () => {
    const module = loadModule("ignition", "TestModule");

    if (module === undefined) {
      assert.fail("Module was not loaded");
    }

    assert.equal(module.id, "testing123");
  });

  it("should return the module given the module name and extension", () => {
    const module = loadModule("ignition", "TestModule.js");

    if (module === undefined) {
      assert.fail("Module was not loaded");
    }

    assert.equal(module.id, "testing123");
  });

  it("should throw if the module name does not exist", () => {
    assert.throws(() => loadModule("ignition", "Fake"));
  });

  it("should throw if the module name with extension does not exist", () => {
    assert.throws(() => loadModule("ignition", "Fake.js"));
  });

  it("should throw if the full path to the module does not exist", () => {
    assert.throws(() => loadModule("ignition", "./ignition/Fake.js"));
  });

  it("should throw if the full path to the module is outside the module directory", () => {
    const unixErrorMessage = `The referenced module ./hardhat.config.js is outside the module directory ignition/modules`;

    const expectedErrorMessage =
      process.platform === "win32"
        ? unixErrorMessage.replace("ignition/modules", "ignition\\modules")
        : unixErrorMessage;

    assert.throws(
      () => loadModule("ignition", "./hardhat.config.js"),
      expectedErrorMessage
    );
  });

  it("should throw if given a user module directory that does not exist", async () => {
    assert.throws(
      () => loadModule("/fake", "AFile.js"),
      `Ignition directory /fake not found.`
    );
  });
});
