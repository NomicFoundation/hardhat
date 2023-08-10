/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { loadModule } from "../src/load-module";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

// eslint-disable-next-line no-only-tests/no-only-tests
describe.only("loadModule", function () {
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
    assert.throws(
      () => loadModule("contracts", "./ignition/TestModule.js"),
      `The referenced module ./ignition/TestModule.js is outside the module directory contracts`
    );
  });

  it("should throw if given a user module directory that does not exist", async () => {
    assert.throws(
      () => loadModule("/fake", "AFile.js"),
      `Directory /fake not found.`
    );
  });
});
