import { assert } from "chai";

import { DeploymentState } from "../src/deployment-state";
import {
  ExecutionEngine,
  ExecutionEngineOptions,
  IgnitionRecipesResults,
} from "../src/execution-engine";
import { InMemoryJournal } from "../src/journal/InMemoryJournal";
import { ExecutionGraph } from "../src/recipes/ExecutionGraph";

import { getMockedProviders, inc, runUntil, runUntilReady } from "./helpers";

const mockRecipesResults: IgnitionRecipesResults = {
  load: async () => {
    return undefined;
  },
  save: async () => {},
};

const executionEngineOptions: ExecutionEngineOptions = {
  parallelizationLevel: 1,
  loggingEnabled: false,
  txPollingInterval: 100,
};

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip("ExecutionEngine", function () {
  it("should run a single recipe with a single executor", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new InMemoryJournal(),
      mockRecipesResults,
      executionEngineOptions
    );

    const inc1 = inc("MyRecipe", "inc1", 1);

    const executionGraph = new ExecutionGraph();
    executionGraph.addExecutor(inc1);

    // when
    const executionGenerator = executionEngine.execute(executionGraph);
    const deploymentResult = await runUntilReady(executionGenerator);

    // then
    const resultRecipes = deploymentResult.getRecipes();

    assert.lengthOf(resultRecipes, 1);
    const [resultRecipe] = resultRecipes;
    assert.isTrue(resultRecipe.isSuccess());
    assert.equal(resultRecipe.count(), 1);

    const futureResult = deploymentResult.getFutureResult("MyRecipe", "inc1");

    assert.equal(futureResult, 2);

    assert.isTrue(inc1.isSuccess());
  });

  it("should wait for a dependency", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new InMemoryJournal(),
      mockRecipesResults,
      executionEngineOptions
    );

    const executionGraph = new ExecutionGraph();
    const inc1 = inc("MyRecipe", "inc1", 1);
    inc1.behavior = "on-demand";
    const incInc1 = inc("MyRecipe", "incInc1", inc1.future);
    executionGraph.addExecutor(inc1);
    executionGraph.addExecutor(incInc1);

    // when
    const executionGenerator = executionEngine.execute(executionGraph);
    await runUntil(executionGenerator, () => {
      return inc1.isRunning();
    });

    // then
    assert.isTrue(incInc1.isReady());

    // when
    inc1.finish();
    const deploymentState: DeploymentState = await runUntil(
      executionGenerator,
      (result) => {
        return result !== undefined;
      }
    );

    // then
    const resultRecipes = deploymentState.getRecipes();

    assert.lengthOf(resultRecipes, 1);
    assert.isTrue(resultRecipes[0].isSuccess());
    assert.equal(resultRecipes[0].count(), 2);

    const inc1Result = deploymentState.getFutureResult("MyRecipe", "inc1");
    const incInc1Result = deploymentState.getFutureResult(
      "MyRecipe",
      "incInc1"
    );

    assert.equal(inc1Result, 2);
    assert.equal(incInc1Result, 3);

    assert.isTrue(inc1.isSuccess());
    assert.isTrue(incInc1.isSuccess());
  });

  it("should not run an executor if a dependency fails", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new InMemoryJournal(),
      mockRecipesResults,
      executionEngineOptions
    );

    const executionGraph = new ExecutionGraph();
    const inc1 = inc("MyRecipe", "inc1", 1);
    inc1.behavior = "fail";
    const incInc1 = inc("MyRecipe", "incInc1", inc1.future);
    executionGraph.addExecutor(inc1);
    executionGraph.addExecutor(incInc1);

    // when
    const executionGenerator = executionEngine.execute(executionGraph);
    const deploymentResult = await runUntilReady(executionGenerator);

    // then
    const resultRecipes = deploymentResult.getRecipes();

    assert.lengthOf(resultRecipes, 1);
    assert.isFalse(resultRecipes[0].isSuccess());
    assert.isTrue(resultRecipes[0].isFailure());

    assert.isTrue(inc1.isFailure());
    assert.isTrue(incInc1.isReady());
  });

  it("should not run an executor if a dependency holds", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new InMemoryJournal(),
      mockRecipesResults,
      executionEngineOptions
    );

    const executionGraph = new ExecutionGraph();
    const inc1 = inc("MyRecipe", "inc1", 1);
    inc1.behavior = "hold";
    const incInc1 = inc("MyRecipe", "incInc1", inc1.future);
    executionGraph.addExecutor(inc1);
    executionGraph.addExecutor(incInc1);

    // when
    const executionGenerator = executionEngine.execute(executionGraph);
    const deploymentResult = await runUntilReady(executionGenerator);

    // then
    if (deploymentResult === undefined) {
      assert.fail("Deployment result should be ready");
    }
    const resultRecipes = deploymentResult.getRecipes();

    assert.lengthOf(resultRecipes, 1);
    assert.isTrue(resultRecipes[0].isHold());

    assert.isTrue(inc1.isHold());
    assert.isTrue(incInc1.isReady());
  });
});
