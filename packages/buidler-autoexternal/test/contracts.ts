import { assert } from "chai";
import fsExtra from "fs-extra";

import { DEFAULT_CONFIG } from "../src/config";
import { generateTestableContract } from "../src/contracts";

import { useEnvironment } from "./helpers";

describe("TestableContracts generation", function() {
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

  useEnvironment(__dirname + "/buidler-project");

  beforeEach("clear cache directory", async function() {
    await fsExtra.emptyDir(this.env.config.paths.cache);
  });

  describe("Enabling annotation", function() {
    it("Should ignore a file without the annotation", async function() {
      const testableContractPath = await generateTestableContract(
        this.env.config.paths,
        DEFAULT_CONFIG,
        __dirname + "/buidler-project/contracts/WithoutAnnotation.sol"
      );

      assert.isUndefined(testableContractPath);
    });

    it("Should process a file if it has an annotation", async function() {
      const testableContractPath = await generateTestableContract(
        this.env.config.paths,
        DEFAULT_CONFIG,
        __dirname + "/buidler-project/contracts/WithAnnotation.sol"
      );

      assert.isDefined(testableContractPath);
    });

    it("all testable contract's functions should be external", async function() {
      const testableContractPath = await generateTestableContract(
        this.env.config.paths,
        DEFAULT_CONFIG,
        __dirname + "/buidler-project/contracts/WithAnnotation.sol"
      );
      assert.isDefined(testableContractPath);
      const testableFunctions = await getFunctionNodes(testableContractPath!);

      testableFunctions.forEach(node => {
        assert.equal(node.visibility, "external");
      });
    });

    it("testable contract should contain the expected functions", async function() {
      const testableContractPath = await generateTestableContract(
        this.env.config.paths,
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
      const parsed = await generateTestableContract(
        this.env.config.paths,
        DEFAULT_CONFIG,
        __dirname + "/buidler-project/contracts/WithSyntaxErrors.sol"
      );
      assert.isUndefined(parsed);
    });

    it("should not re-create unmodified contracts", async function() {
      const contractPath =
        __dirname + "/buidler-project/contracts/WithAnnotation.sol";
      let testableContractPath = await generateTestableContract(
        this.env.config.paths,
        DEFAULT_CONFIG,
        contractPath
      );

      assert.isDefined(testableContractPath);
      assert.isTrue(await fsExtra.pathExists(testableContractPath!));

      testableContractPath = await generateTestableContract(
        this.env.config.paths,
        DEFAULT_CONFIG,
        contractPath
      );
      assert.isUndefined(testableContractPath);
    });
  });
});
