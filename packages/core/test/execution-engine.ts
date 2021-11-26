import { assert } from "chai";

import { DeploymentState } from "../src/deployment-state";
import { ExecutionEngine } from "../src/execution-engine";
import { NullJournal } from "../src/journal";
import { DAG } from "../src/modules";

import {
  emptyDeploymentResult,
  getMockedProviders,
  inc,
  runUntil,
  runUntilReady,
} from "./helpers";

const executionEngineOptions = {
  parallelizationLevel: 1,
  loggingEnabled: false,
  txPollingInterval: 100,
};

describe("ExecutionEngine", function () {
  it("should run a single module with a single executor", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new NullJournal(),
      executionEngineOptions
    );

    const inc1 = inc("MyModule", "inc1", 1);

    const dag = new DAG();
    dag.addExecutor(inc1);

    // when
    const executionGenerator = executionEngine.execute(
      dag,
      emptyDeploymentResult(dag)
    );
    const deploymentResult = await runUntilReady(executionGenerator);

    // then
    const resultModules = deploymentResult.getModules();

    assert.lengthOf(resultModules, 1);
    const [resultModule] = resultModules;
    assert.isTrue(resultModule.isSuccess());
    assert.equal(resultModule.count(), 1);

    const bindingResult = deploymentResult.getBindingResult("MyModule", "inc1");

    assert.equal(bindingResult, 2);

    assert.isTrue(inc1.isSuccess());
  });

  it("should wait for a dependency", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new NullJournal(),
      executionEngineOptions
    );

    const dag = new DAG();
    const inc1 = inc("MyModule", "inc1", 1);
    inc1.behavior = "on-demand";
    const incInc1 = inc("MyModule", "incInc1", inc1.binding);
    dag.addExecutor(inc1);
    dag.addExecutor(incInc1);

    // when
    const executionGenerator = executionEngine.execute(
      dag,
      emptyDeploymentResult(dag)
    );
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
    const resultModules = deploymentState.getModules();

    assert.lengthOf(resultModules, 1);
    assert.isTrue(resultModules[0].isSuccess());
    assert.equal(resultModules[0].count(), 2);

    const inc1Result = deploymentState.getBindingResult("MyModule", "inc1");
    const incInc1Result = deploymentState.getBindingResult(
      "MyModule",
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
      new NullJournal(),
      executionEngineOptions
    );

    const dag = new DAG();
    const inc1 = inc("MyModule", "inc1", 1);
    inc1.behavior = "fail";
    const incInc1 = inc("MyModule", "incInc1", inc1.binding);
    dag.addExecutor(inc1);
    dag.addExecutor(incInc1);

    // when
    const executionGenerator = executionEngine.execute(
      dag,
      emptyDeploymentResult(dag)
    );
    const deploymentResult = await runUntilReady(executionGenerator);

    // then
    const resultModules = deploymentResult.getModules();

    assert.lengthOf(resultModules, 1);
    assert.isFalse(resultModules[0].isSuccess());
    assert.isTrue(resultModules[0].isFailure());

    assert.isTrue(inc1.isFailure());
    assert.isTrue(incInc1.isReady());
  });

  it("should not run an executor if a dependency holds", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new NullJournal(),
      executionEngineOptions
    );

    const dag = new DAG();
    const inc1 = inc("MyModule", "inc1", 1);
    inc1.behavior = "hold";
    const incInc1 = inc("MyModule", "incInc1", inc1.binding);
    dag.addExecutor(inc1);
    dag.addExecutor(incInc1);

    // when
    const executionGenerator = executionEngine.execute(
      dag,
      emptyDeploymentResult(dag)
    );
    const deploymentResult = await runUntilReady(executionGenerator);

    // then
    if (deploymentResult === undefined) {
      assert.fail("Deployment result should be ready");
    }
    const resultModules = deploymentResult.getModules();

    assert.lengthOf(resultModules, 1);
    assert.isTrue(resultModules[0].isHold());

    assert.isTrue(inc1.isHold());
    assert.isTrue(incInc1.isReady());
  });
});
