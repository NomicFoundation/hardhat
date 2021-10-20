import { expect } from "chai";

import { DAG } from "../src/modules";
import { inc } from "./helpers";

describe("DAG", function () {
  describe("sort modules", function () {
    it("should work for a single module", function () {
      // given
      const dag = new DAG();
      dag.addExecutor(inc("MyModule", "inc1", 1));

      // when
      const ignitionModules = dag.getSortedModules().map((m) => m.id);

      // then
      expect(ignitionModules).to.deep.equal(["MyModule"]);
    });

    it("should work for two modules", function () {
      // given
      const dag = new DAG();
      const module1Inc = inc("Module1", "inc1", 1);
      const module2Inc = inc("Module2", "inc1", module1Inc.binding);

      dag.addExecutor(module2Inc);
      dag.addExecutor(module1Inc);

      // when
      const ignitionModules = dag.getSortedModules().map((m) => m.id);

      // then
      expect(ignitionModules).to.deep.equal(["Module1", "Module2"]);
    });
  });

  describe("sort executors", function () {
    it("should work for a single executor", function () {
      // given
      const dag = new DAG();
      dag.addExecutor(inc("MyModule", "inc1", 1));

      // when
      const [ignitionModule] = dag.getModules();
      const executors = ignitionModule
        .getSortedExecutors()
        .map((e) => e.binding.id);

      // then
      expect(executors).to.deep.equal(["inc1"]);
    });

    it("should work for two executors", function () {
      // given
      const dag = new DAG();
      const inc1 = inc("MyModule", "inc1", 1);
      dag.addExecutor(inc("MyModule", "incInc1", inc1.binding));
      dag.addExecutor(inc1);

      // when
      const [ignitionModule] = dag.getModules();
      const executors = ignitionModule
        .getSortedExecutors()
        .map((e) => e.binding.id);

      // then
      expect(executors).to.deep.equal(["inc1", "incInc1"]);
    });

    it("should work for three sequential executors", function () {
      // given
      const dag = new DAG();
      const inc1 = inc("MyModule", "inc1", 1);
      const incInc1 = inc("MyModule", "incInc1", inc1.binding);
      const incIncInc1 = inc("MyModule", "incIncInc1", incInc1.binding);
      dag.addExecutor(incIncInc1);
      dag.addExecutor(inc1);
      dag.addExecutor(incInc1);

      // when
      const [ignitionModule] = dag.getModules();
      const executors = ignitionModule
        .getSortedExecutors()
        .map((e) => e.binding.id);

      // then
      expect(executors).to.deep.equal(["inc1", "incInc1", "incIncInc1"]);
    });
  });
});
