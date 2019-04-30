import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { assert } from "chai";
import fsExtra from "fs-extra";

import { getAutoexternalConfig } from "../src/config";
import {
  getGeneratedFilePath,
  processSourceFile,
  readSourceFile
} from "../src/contracts";

import { useEnvironment } from "./helpers";

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

function assertReturnsSupperCall(
  functionNode: any,
  superFunctionName: string,
  parameters: string[] = []
) {
  assert.equal(functionNode.body.type, "Block");
  assert.lengthOf(functionNode.body.statements, 1);

  const returnStatement = functionNode.body.statements[0];
  assert.equal(returnStatement.type, "ReturnStatement");

  const returnedFunctionCall = returnStatement.expression;
  assert.equal(returnedFunctionCall.type, "FunctionCall");

  const memberAccessFunctionExpression = returnedFunctionCall.expression;
  assert.equal(memberAccessFunctionExpression.type, "MemberAccess");

  const accessedIdentifierExpression =
    memberAccessFunctionExpression.expression;
  assert.equal(accessedIdentifierExpression.type, "Identifier");
  assert.equal(accessedIdentifierExpression.name, "super");

  assert.equal(memberAccessFunctionExpression.memberName, superFunctionName);

  assert.lengthOf(returnedFunctionCall.arguments, parameters.length);

  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < returnedFunctionCall.arguments.length; i++) {
    const argument = returnedFunctionCall.arguments[i];
    assert.equal(argument.type, "Identifier");
    assert.equal(argument.name, parameters[i]);
  }
}

describe("TestableContracts generation", function() {
  useEnvironment(__dirname + "/buidler-project");

  afterEach("clear cache directory", async function() {
    await fsExtra.emptyDir(this.env.config.paths.cache);
  });

  describe("Enabling annotation", function() {
    it("Should ignore a file without the annotation", async function() {
      const sourceFiles = await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);

      const generatedFilePath = getGeneratedFilePath(
        this.env.config.paths,
        this.env.config.paths.sources + "/WithoutAnnotation.sol"
      );

      assert.notInclude(sourceFiles, generatedFilePath);
    });

    it("Should process a file if it includes the annotation", async function() {
      const sourceFiles = await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);

      const generatedFilePath = getGeneratedFilePath(
        this.env.config.paths,
        this.env.config.paths.sources + "/WithAnnotation.sol"
      );

      assert.include(sourceFiles, generatedFilePath);
    });

    it("Should ignore files with syntax errors", async function() {
      const sourceFiles = await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);

      const generatedFilePath = getGeneratedFilePath(
        this.env.config.paths,
        this.env.config.paths.sources + "/WithSyntaxErrors.sol"
      );

      assert.notInclude(sourceFiles, generatedFilePath);
    });
  });

  describe("Exported functions", function() {
    let testableContractPath: string;

    beforeEach(async function() {
      const sourceFile = await readSourceFile(
        this.env.config.paths,
        __dirname + "/buidler-project/contracts/WithAnnotation.sol"
      );

      const config = getAutoexternalConfig(this.env.config);

      testableContractPath = (await processSourceFile(
        sourceFile,
        __dirname + "/buidler-project/cache/autoexternal/WithAnnotation.sol",
        this.env.config.paths,
        config
      ))!;
    });

    it("Should make all functions external", async function() {
      const testableFunctions = await getFunctionNodes(testableContractPath);

      testableFunctions.forEach(node => {
        assert.equal(node.visibility, "external");
      });
    });

    it("Should export all the expected functions", async function() {
      const testableFunctions = await getFunctionNodes(testableContractPath);

      assertReturnsSupperCall(
        testableFunctions[0],
        "_exportedInternalFunction",
        ["i", "_b", "asd"]
      );

      assert.sameMembers(testableFunctions.map(node => node.name), [
        "exportedInternalFunction",
        "exportedInternalFunctionWithSingleReturnValue"
      ]);
    });

    it("Should return what the actual implementation returns", async function() {
      const testableFunctions = await getFunctionNodes(testableContractPath);

      assertReturnsSupperCall(
        testableFunctions[0],
        "_exportedInternalFunction",
        ["i", "_b", "asd"]
      );

      assertReturnsSupperCall(
        testableFunctions[1],
        "_exportedInternalFunctionWithSingleReturnValue"
      );
    });
  });

  describe("Cache", function() {
    it("should not re-create unmodified contracts", async function() {
      await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);

      const testableContractPath = getGeneratedFilePath(
        this.env.config.paths,
        __dirname + "/buidler-project/contracts/WithAnnotation.sol"
      );

      assert.isTrue(await fsExtra.pathExists(testableContractPath));
      const initialStat = await fsExtra.stat(testableContractPath);

      await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);

      const finalStat = await fsExtra.stat(testableContractPath);

      assert.deepEqual(finalStat.mtime, initialStat.mtime);
    });
  });
});
