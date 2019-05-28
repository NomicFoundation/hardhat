import { TASK_TEST } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { assert } from "chai";

import { useEnvironment } from "./helpers";

describe("Ganache plugin", async function() {
  describe("Example tests", async function() {
    useEnvironment(__dirname + "/buidler-project");

    it("should load the environment", async function() {
      // This is the Buidler Runtime Environment
      assert.isDefined(this.env);
    });

    it("should run a task", async function() {
      // This runs a task and returns the result
      const result = await this.env.run(TASK_TEST, {
        testFiles: ["test/mock-test.ts"],
        noCompile: true
      });

      console.log(`Result: ${JSON.stringify(result)}`);

      // Here you can assert things about the result
      // assert.isArray(result);
    });
  });
});
