import { assert } from "chai";
import fsExtra from "fs-extra";

import { DEFAULT_CONFIG } from "../src/config";
import { generateTestableContract } from "../src/contracts";

import { useEnvironment } from "./helpers";

describe("BuidlerRuntimeEnvironment extension", function() {
  useEnvironment(__dirname + "/buidler-project");
  beforeEach("Buidler project setup", async function() {
    await fsExtra.emptyDir("./cache");
    await fsExtra.rmdir("./cache");

    await fsExtra.emptyDir("./artifacts");
    await fsExtra.rmdir("./artifacts");
  });

  it("The example filed should say hello", async function() {});
});

describe("TestableContracts generation", function() {
  const paths = {
    artifacts: "",
    cache: __dirname + "/buidler-project/contracts/cache",
    configFile: "",
    root: __dirname + "/buidler-project",
    sources: __dirname + "/buidler-project/contracts",
    tests: "."
  };

  describe("Enabling annotation", function() {
    it("Should ignore a file without the annotation", async function() {
      const testableContractPath = await generateTestableContract(
        paths,
        DEFAULT_CONFIG,
        __dirname + "/buidler-project/contracts/WithoutAnnotation.sol"
      );

      assert.isUndefined(testableContractPath);
    });

    it("Should process a file if it has an annotation", async function() {
      const testableContractPath = await generateTestableContract(
        paths,
        DEFAULT_CONFIG,
        __dirname + "/buidler-project/contracts/WithAnnotation.sol"
      );

      assert.isDefined(testableContractPath);
    });
  });
});
