import path from "node:path";
import { fileURLToPath } from "node:url";

describe("ignition helper mutual exclusivity", () => {
  let originalCwd: string;
  before(function () {
    originalCwd = process.cwd();

    process.chdir(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "./fixture-projects",
        "with-fake-helper",
      ),
    );
  });

  after(function () {
    process.chdir(originalCwd);
  });

  // TODO: HH3 bring back this test
  it.skip("should error when loaded in conjunction with hardhat-ignition-ethers", async function () {
    // assert.throws(
    //   () => require("hardhat"),
    //   /Found ethers and viem, but only one Hardhat Ignition extension plugin can be used at a time\./
    // );
  });
});
