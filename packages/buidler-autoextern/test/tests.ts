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
  before(async function() {
    this.parser = await import("solidity-parser-antlr");
  });

  beforeEach("clear cache directory", async function() {
    await fsExtra.emptyDir(paths.cache);
  });

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

    it("all testable contract's functions should be external", async function() {
      const originalContractPath =
        __dirname + "/buidler-project/contracts/WithAnnotation.sol";
      const testableContractPath = await generateTestableContract(
        paths,
        DEFAULT_CONFIG,
        originalContractPath
      );
      assert.isDefined(testableContractPath);
      const testableFunctions = await getFunctionNodes(testableContractPath!);

      testableFunctions.forEach(node => {
        assert.equal(node.visibility, "external");
      });
    });

    it("testable contract should contain the expected functions", async function() {
      const testableContractPath = await generateTestableContract(
        paths,
        DEFAULT_CONFIG,
        __dirname + "/buidler-project/contracts/WithAnnotation.sol"
      );
      assert.isDefined(testableContractPath);
      const testableFunctions = await getFunctionNodes(testableContractPath!);

      assert.sameMembers(testableFunctions.map(node => node.name), [
        "exportedInternalFunction",
        "exportedInternalFunctionWithSingleReturnValue"
      ]);
    });

    it("should return undefined if the contract cannot be parsed", async function() {
      const contractPath =
        __dirname + "/buidler-project/contracts/WithSyntaxErrors.sol";

      const parsed = await generateTestableContract(
        paths,
        DEFAULT_CONFIG,
        contractPath
      );
      assert.isUndefined(parsed);
    });

    it("should not re-create unmodified contracts", async function() {
      let testableContractPath = await generateTestableContract(
        paths,
        DEFAULT_CONFIG,
        __dirname + "/buidler-project/contracts/WithAnnotation.sol"
      );
      assert.isDefined(testableContractPath);
      testableContractPath = await generateTestableContract(
        paths,
        DEFAULT_CONFIG,
        __dirname + "/buidler-project/contracts/WithAnnotation.sol"
      );
      assert.isUndefined(testableContractPath);
    });
  });
});

async function getFunctionNodes(contractPath: string) {
  const parser = await import("solidity-parser-antlr");
  const content = await fsExtra.readFile(contractPath, "utf-8");
  const ast = parser.parse(content, { range: true });

  const nodes: any[] = [];
  parser.visit(ast, {
    FunctionDefinition(node: any) {
      nodes.push(node);
    }
  });
  return nodes;
}
