// import { assert } from "chai";
import { describe, it } from "mocha";
import { useEnvironment } from "./helpers";

describe("default config project", function () {
  useEnvironment("minimal-config");

  it("should run tests", async function () {
    await this.env.run("test", {
      noCompile: true,
    });
  });
});
