import { assert } from "chai";

import { useEnvironment } from "./helpers";

describe("Ganache plugin", async function() {
  describe("Example tests", async function() {
    useEnvironment(__dirname + "/buidler-project");

    it("should load the environment", async function() {
      // This is the Buidler Runtime Environment
      assert.isDefined(this.env);
    });
  });
});
