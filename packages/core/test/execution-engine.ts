import { expect } from "chai";

import { ExecutionEngine } from "../src/execution-engine";
import { NullJournal } from "../src/journal";
import { DAG } from "../src/modules";
import { emptyDeploymentResult, getMockedProviders, inc } from "./helpers";

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
      emptyDeploymentResult(),
      executionEngineOptions
    );

    const inc1 = inc("MyModule", "inc1", 1);

    const dag = new DAG();
    dag.addExecutor(inc1);

    // when
    const deploymentResult = await executionEngine.execute(dag);

    // then
    const resultModules = deploymentResult.getModules();

    expect(resultModules).to.have.length(1);
    const [resultModule] = resultModules;
    expect(resultModule.isSuccess()).to.equal(true);
    expect(resultModule.count()).to.equal(1);

    const bindingResult = resultModule.getResult("inc1");

    expect(bindingResult).to.equal(2);

    expect(inc1.isSuccess()).to.equal(true);
  });

  it("should wait for a dependency", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new NullJournal(),
      emptyDeploymentResult(),
      executionEngineOptions
    );

    const dag = new DAG();
    const inc1 = inc("MyModule", "inc1", 1);
    const incInc1 = inc("MyModule", "incInc1", inc1.binding);
    dag.addExecutor(inc1);
    dag.addExecutor(incInc1);

    // when
    const deploymentResult = await executionEngine.execute(dag);

    // then
    const resultModules = deploymentResult.getModules();

    expect(resultModules).to.have.length(1);
    expect(resultModules[0].isSuccess()).to.equal(true);
    expect(resultModules[0].count()).to.equal(2);

    const inc1Result = resultModules[0].getResult("inc1");
    const incInc1Result = resultModules[0].getResult("incInc1");

    expect(inc1Result).to.equal(2);
    expect(incInc1Result).to.equal(3);

    expect(inc1.isSuccess()).to.equal(true);
    expect(incInc1.isSuccess()).to.equal(true);
  });

  it("should not run an executor if a dependency fails", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new NullJournal(),
      emptyDeploymentResult(),
      executionEngineOptions
    );

    const dag = new DAG();
    const inc1 = inc("MyModule", "inc1", 1);
    inc1.behavior = "fail";
    const incInc1 = inc("MyModule", "incInc1", inc1.binding);
    dag.addExecutor(inc1);
    dag.addExecutor(incInc1);

    // when
    const deploymentResult = await executionEngine.execute(dag);

    // then
    const resultModules = deploymentResult.getModules();

    expect(resultModules).to.have.length(1);
    expect(resultModules[0].isSuccess()).to.equal(false);
    expect(resultModules[0].isFailure()).to.equal(true);

    expect(inc1.isFailure()).to.equal(true);
    expect(incInc1.isReady()).to.equal(true);
  });

  it("should not run an executor if a dependency holds", async function () {
    // given
    const executionEngine = new ExecutionEngine(
      getMockedProviders(),
      new NullJournal(),
      emptyDeploymentResult(),
      executionEngineOptions
    );

    const dag = new DAG();
    const inc1 = inc("MyModule", "inc1", 1);
    inc1.behavior = "hold";
    const incInc1 = inc("MyModule", "incInc1", inc1.binding);
    dag.addExecutor(inc1);
    dag.addExecutor(incInc1);

    // when
    const deploymentResult = await executionEngine.execute(dag);

    // then
    const resultModules = deploymentResult.getModules();

    expect(resultModules).to.have.length(1);
    expect(resultModules[0].isHold()).to.equal(true);

    expect(inc1.isHold()).to.equal(true);
    expect(incInc1.isReady()).to.equal(true);
  });
});
