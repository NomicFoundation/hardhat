import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

describe("console.sol", function () {
  useFixtureProject("memory-safe-console");
  useEnvironment();

  it("should be memory safe", async function () {
    // the memory-safe-console fixture project won't compile
    // if console.sol is not memory-safe
    await this.env.run("compile");
  });
});
