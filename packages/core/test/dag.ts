/* eslint-disable mocha/no-skipped-tests */
import { expect } from "chai";

import { ExecutionGraph } from "../src/recipes/ExecutionGraph";

import { inc } from "./helpers";

describe("ExecutionGraph", function () {
  describe("sort recipes", function () {
    it.skip("should work for a single recipe", function () {
      // given
      const executionGraph = new ExecutionGraph();
      executionGraph.addExecutor(inc("MyRecipe", "inc1", 1));

      // when
      const ignitionRecipes = executionGraph
        .getSortedRecipes()
        .map((m) => m.id);

      // then
      expect(ignitionRecipes).to.deep.equal(["MyRecipe"]);
    });

    it.skip("should work for two recipes", function () {
      // given
      const executionGraph = new ExecutionGraph();
      const recipe1Inc = inc("Recipe1", "inc1", 1);
      const recipe2Inc = inc("Recipe2", "inc1", recipe1Inc.future);

      executionGraph.addExecutor(recipe2Inc);
      executionGraph.addExecutor(recipe1Inc);

      // when
      const ignitionRecipes = executionGraph
        .getSortedRecipes()
        .map((m) => m.id);

      // then
      expect(ignitionRecipes).to.deep.equal(["Recipe1", "Recipe2"]);
    });
  });

  describe("sort executors", function () {
    it.skip("should work for a single executor", function () {
      // given
      const executionGraph = new ExecutionGraph();
      executionGraph.addExecutor(inc("MyRecipe", "inc1", 1));

      // when
      const [ignitionRecipe] = executionGraph.getSortedRecipes();
      const executors = ignitionRecipe
        .getSortedExecutors()
        .map((e) => e.future.id);

      // then
      expect(executors).to.deep.equal(["inc1"]);
    });

    it.skip("should work for two executors", function () {
      // given
      const executionGraph = new ExecutionGraph();
      const inc1 = inc("MyRecipe", "inc1", 1);
      executionGraph.addExecutor(inc("MyRecipe", "incInc1", inc1.future));
      executionGraph.addExecutor(inc1);

      // when
      const [ignitionRecipe] = executionGraph.getSortedRecipes();
      const executors = ignitionRecipe
        .getSortedExecutors()
        .map((e) => e.future.id);

      // then
      expect(executors).to.deep.equal(["inc1", "incInc1"]);
    });

    it.skip("should work for three sequential executors", function () {
      // given
      const executionGraph = new ExecutionGraph();
      const inc1 = inc("MyRecipe", "inc1", 1);
      const incInc1 = inc("MyRecipe", "incInc1", inc1.future);
      const incIncInc1 = inc("MyRecipe", "incIncInc1", incInc1.future);
      executionGraph.addExecutor(incIncInc1);
      executionGraph.addExecutor(inc1);
      executionGraph.addExecutor(incInc1);

      // when
      const [ignitionRecipe] = executionGraph.getSortedRecipes();
      const executors = ignitionRecipe
        .getSortedExecutors()
        .map((e) => e.future.id);

      // then
      expect(executors).to.deep.equal(["inc1", "incInc1", "incIncInc1"]);
    });
  });
});
