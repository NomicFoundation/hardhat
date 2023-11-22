import { expect } from "chai";
import { useFixtureProject } from "../../../helpers/project";

const { execSync } = require("child_process");

describe("npx hardhat compile", () => {
  useFixtureProject("base-project", ["hardhat"]);

  beforeEach(() => {});

  it("should compile the file successfully", () => {
    // Be sure that the cache is clean
    execSync("npx hardhat clean", { encoding: "utf-8" });

    const output = execSync("npx hardhat compile", { encoding: "utf-8" });

    expect(output).to.contain(
      "Compiled 1 Solidity file successfully (evm target: paris)"
    );
  });

  it("should not compile the file because the result is cached, the file did not changed", () => {
    const output = execSync("npx hardhat compile", { encoding: "utf-8" });

    expect(output).to.contain("Nothing to compile");
  });
});
