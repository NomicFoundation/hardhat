/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import {
  loadUserModules,
  loadAllUserModules,
  getUserModulesFromPaths,
  getUserModulesPaths,
  getAllUserModulesPaths,
} from "../src/user-recipes";

import { useEnvironment } from "./useEnvironment";

describe("User recipes", function () {
  useEnvironment("user-recipes");

  describe("loadUserRecipes", function () {
    it("should throw if given a user recipe directory that does not exist", async () => {
      assert.throws(
        () => loadUserModules("/fake", []),
        `Directory /fake not found.`
      );
    });
  });

  describe("loadAllUserRecipes", function () {
    it("should throw if given a user recipe directory that does not exist", async () => {
      assert.throws(
        () => loadAllUserModules("/fake"),
        `Directory /fake not found.`
      );
    });
  });

  describe("getAllUserRecipesPaths", function () {
    it("should return file paths for all user recipes in a given directory", () => {
      const paths = getAllUserModulesPaths("ignition");

      assert.equal(paths.length, 1);
      assert(paths[0].endsWith("TestRecipe.js"));
    });
  });

  describe("getUserRecipesPaths", function () {
    it("should return file paths for the given user recipe files", () => {
      const paths = getUserModulesPaths("ignition", ["TestRecipe.js"]);

      assert.equal(paths.length, 1);
      assert(paths[0].endsWith("TestRecipe.js"));
    });
  });

  describe("getUserRecipesFromPaths", function () {
    it("should return a user recipe from a given path", () => {
      const paths = getUserModulesPaths("ignition", ["TestRecipe.js"]);
      const recipes = getUserModulesFromPaths(paths);

      assert.equal(recipes.length, 1);
      // assert.equal(recipes[0].id, "testing123");
    });

    it("should throw if given a file that does not exist", () => {
      assert.throws(() => getUserModulesFromPaths(["/fake"]));
    });
  });
});
