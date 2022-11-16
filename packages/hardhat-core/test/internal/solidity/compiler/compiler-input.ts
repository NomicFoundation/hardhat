import { assert } from "chai";

import { defaultSolcOutputSelection } from "../../../../src/internal/core/config/default-config";
import { CompilationJob } from "../../../../src/internal/solidity/compilation-job";
import { getInputFromCompilationJob } from "../../../../src/internal/solidity/compiler/compiler-input";
import { ResolvedFile } from "../../../../src/internal/solidity/resolver";
import { CompilerInput } from "../../../../src/types";

describe("compiler-input module", function () {
  it("Should construct the right input for a compilation job", async () => {
    const optimizerConfig = {
      runs: 200,
      enabled: false,
    };

    const sourceName1 = "the/source/name.sol";
    const path1 = "/fake/absolute/path";
    const content1 = "THE CONTENT1";

    const sourceName2 = "the/source/name2.sol";
    const path2 = "/fake/absolute/path2";
    const content2 = "THE CONTENT2";

    const expectedInput: CompilerInput = {
      language: "Solidity",
      sources: {
        [sourceName1]: { content: content1 },
        [sourceName2]: { content: content2 },
      },
      settings: {
        optimizer: optimizerConfig,
        outputSelection: {
          "*": {
            "*": [
              "abi",
              "evm.bytecode",
              "evm.deployedBytecode",
              "evm.methodIdentifiers",
              "metadata",
            ],
            "": ["ast"],
          },
        },
      },
    };

    const files = [
      new ResolvedFile(
        sourceName1,
        path1,
        { rawContent: content1, imports: [], versionPragmas: [] },
        "<content-hash-1>",
        new Date()
      ),
      new ResolvedFile(
        sourceName2,
        path2,
        { rawContent: content2, imports: [], versionPragmas: [] },
        "<content-hash-2>",
        new Date()
      ),
    ];

    const job = new CompilationJob({
      version: "0.5.5",
      settings: {
        optimizer: optimizerConfig,
        outputSelection: defaultSolcOutputSelection,
      },
    });
    job.addFileToCompile(files[0], true);
    job.addFileToCompile(files[1], true);

    const input = getInputFromCompilationJob(job);

    assert.deepEqual(input, expectedInput);

    const jobWithEvmVersion = new CompilationJob({
      version: "0.5.5",
      settings: {
        optimizer: optimizerConfig,
        evmVersion: "byzantium",
        outputSelection: defaultSolcOutputSelection,
      },
    });
    jobWithEvmVersion.addFileToCompile(files[0], true);
    jobWithEvmVersion.addFileToCompile(files[1], true);
    const inputWithEvmVersion = getInputFromCompilationJob(jobWithEvmVersion);

    expectedInput.settings.evmVersion = "byzantium";

    assert.deepEqual(inputWithEvmVersion, expectedInput);
  });
});
