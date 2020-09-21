import { assert } from "chai";

import { CompilationJob } from "../../../../src/internal/solidity/compilation-job";
import { getInputFromCompilationJob } from "../../../../src/internal/solidity/compiler/compiler-input";
import { ResolvedFile } from "../../../../src/internal/solidity/resolver";
import { SolcInput } from "../../../../src/types";

describe("compiler-input module", function () {
  it("Should construct the right input for a compilation job", async () => {
    const optimizerConfig = {
      runs: 200,
      enabled: false,
    };

    const globalName1 = "the/global/name.sol";
    const path1 = "/fake/absolute/path";
    const content1 = "THE CONTENT1";

    const globalName2 = "the/global/name2.sol";
    const path2 = "/fake/absolute/path2";
    const content2 = "THE CONTENT2";

    const expectedInput: SolcInput = {
      language: "Solidity",
      sources: {
        [globalName1]: { content: content1 },
        [globalName2]: { content: content2 },
      },
      settings: {
        metadata: {
          useLiteralContent: true,
        },
        optimizer: optimizerConfig,
        outputSelection: {
          "*": {
            "*": [
              "abi",
              "evm.bytecode",
              "evm.deployedBytecode",
              "evm.methodIdentifiers",
            ],
            "": ["id", "ast"],
          },
        },
      },
    };

    const files = [
      new ResolvedFile(
        globalName1,
        path1,
        { rawContent: content1, imports: [], versionPragmas: [] },
        new Date()
      ),
      new ResolvedFile(
        globalName2,
        path2,
        { rawContent: content2, imports: [], versionPragmas: [] },
        new Date()
      ),
    ];

    const job = new CompilationJob({
      version: "0.5.5",
      settings: {
        optimizer: optimizerConfig,
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
      },
    });
    jobWithEvmVersion.addFileToCompile(files[0], true);
    jobWithEvmVersion.addFileToCompile(files[1], true);
    const inputWithEvmVersion = getInputFromCompilationJob(jobWithEvmVersion);

    expectedInput.settings.evmVersion = "byzantium";

    assert.deepEqual(inputWithEvmVersion, expectedInput);
  });
});
