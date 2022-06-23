import { expect } from "chai";

import { ExecutionGraph } from "../src/modules/ExecutionGraph";

import { inc } from "./helpers";

describe("ExecutionGraph", function () {
  describe("sort modules", function () {
    it("should work for a single module", function () {
      // given
      const executionGraph = new ExecutionGraph();
      executionGraph.addExecutor(inc("MyModule", "inc1", 1));

      // when
      const ignitionModules = executionGraph
        .getSortedModules()
        .map((m) => m.id);

      // then
      expect(ignitionModules).to.deep.equal(["MyModule"]);
    });

    it("should work for two modules", function () {
      // given
      const executionGraph = new ExecutionGraph();
      const module1Inc = inc("Module1", "inc1", 1);
      const module2Inc = inc("Module2", "inc1", module1Inc.binding);

      executionGraph.addExecutor(module2Inc);
      executionGraph.addExecutor(module1Inc);

      // when
      const ignitionModules = executionGraph
        .getSortedModules()
        .map((m) => m.id);

      // then
      expect(ignitionModules).to.deep.equal(["Module1", "Module2"]);
    });
  });

  describe("sort executors", function () {
    it("should work for a single executor", function () {
      // given
      const executionGraph = new ExecutionGraph();
      executionGraph.addExecutor(inc("MyModule", "inc1", 1));

      // when
      const [ignitionModule] = executionGraph.getSortedModules();
      const executors = ignitionModule
        .getSortedExecutors()
        .map((e) => e.binding.id);

      // then
      expect(executors).to.deep.equal(["inc1"]);
    });

    it("should work for two executors", function () {
      // given
      const executionGraph = new ExecutionGraph();
      const inc1 = inc("MyModule", "inc1", 1);
      executionGraph.addExecutor(inc("MyModule", "incInc1", inc1.binding));
      executionGraph.addExecutor(inc1);

      // when
      const [ignitionModule] = executionGraph.getSortedModules();
      const executors = ignitionModule
        .getSortedExecutors()
        .map((e) => e.binding.id);

      // then
      expect(executors).to.deep.equal(["inc1", "incInc1"]);
    });

    it("should work for three sequential executors", function () {
      // given
      const executionGraph = new ExecutionGraph();
      const inc1 = inc("MyModule", "inc1", 1);
      const incInc1 = inc("MyModule", "incInc1", inc1.binding);
      const incIncInc1 = inc("MyModule", "incIncInc1", incInc1.binding);
      executionGraph.addExecutor(incIncInc1);
      executionGraph.addExecutor(inc1);
      executionGraph.addExecutor(incInc1);

      // when
      const [ignitionModule] = executionGraph.getSortedModules();
      const executors = ignitionModule
        .getSortedExecutors()
        .map((e) => e.binding.id);

      // then
      expect(executors).to.deep.equal(["inc1", "incInc1", "incIncInc1"]);
    });
  });
});
