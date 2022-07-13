import { assert } from "chai";

import {
  loadUserModules,
  loadAllUserModules,
  getUserModulesFromPaths,
  getUserModulesPaths,
  getAllUserModulesPaths,
} from "../src/user-modules";

import { useEnvironment } from "./useEnvironment";

describe("User modules", function () {
  useEnvironment("user-modules");

  describe("loadUserModules", function () {
    it("should throw if given a user module directory that does not exist", async () => {
      assert.throws(
        () => loadUserModules("/fake", []),
        `Directory /fake not found.`
      );
    });
  });

  describe("loadAllUserModules", function () {
    it("should throw if given a user module directory that does not exist", async () => {
      assert.throws(
        () => loadAllUserModules("/fake"),
        `Directory /fake not found.`
      );
    });
  });

  describe("getAllUserModulesPaths", function () {
    it("should return file paths for all user modules in a given directory", () => {
      const paths = getAllUserModulesPaths("ignition");

      assert.equal(paths.length, 1);
      assert(paths[0].endsWith("TestModule.js"));
    });
  });

  describe("getUserModulesPaths", function () {
    it("should return file paths for the given user module files", () => {
      const paths = getUserModulesPaths("ignition", ["TestModule.js"]);

      assert.equal(paths.length, 1);
      assert(paths[0].endsWith("TestModule.js"));
    });
  });

  describe("getUserModulesFromPaths", function () {
    it("should return a user module from a given path", () => {
      const paths = getUserModulesPaths("ignition", ["TestModule.js"]);
      const modules = getUserModulesFromPaths(paths);

      assert.equal(modules.length, 1);
      assert.equal(modules[0].id, "testing123");
    });

    it("should throw if given a file that does not exist", () => {
      assert.throws(() => getUserModulesFromPaths(["/fake"]));
    });
  });
});
