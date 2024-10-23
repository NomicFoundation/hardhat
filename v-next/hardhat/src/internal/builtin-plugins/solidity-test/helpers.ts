import type { ArtifactsManager } from "../../../types/artifacts.js";
import type {
  ArtifactId,
  SuiteResult,
  Artifact,
  SolidityTestRunnerConfigArgs,
  TestResult,
} from "@ignored/edr";

import { runSolidityTests } from "@ignored/edr";
import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { exists } from "@ignored/hardhat-vnext-utils/fs";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";

/**
 * Run all the given solidity tests and returns the whole results after finishing.
 *
 * This function is a direct port of the example v2 integration in the
 * EDR repo (see  https://github.com/NomicFoundation/edr/blob/feat/solidity-tests/js/helpers/src/index.ts).
 * The signature of the function should be considered a draft and may change in the future.
 *
 * TODO: Reconsider the signature and feedback to EDR team.
 */
export async function runAllSolidityTests(
  artifacts: Artifact[],
  testSuites: ArtifactId[],
  configArgs: SolidityTestRunnerConfigArgs,
  testResultCallback: (
    suiteResult: SuiteResult,
    testResult: TestResult,
  ) => void = () => {},
): Promise<SuiteResult[]> {
  return new Promise((resolve, reject) => {
    const resultsFromCallback: SuiteResult[] = [];

    runSolidityTests(
      artifacts,
      testSuites,
      configArgs,
      (suiteResult: SuiteResult) => {
        for (const testResult of suiteResult.testResults) {
          testResultCallback(suiteResult, testResult);
        }

        resultsFromCallback.push(suiteResult);
        if (resultsFromCallback.length === testSuites.length) {
          resolve(resultsFromCallback);
        }
      },
      reject,
    );
  });
}

export async function getArtifacts(
  hardhatArtifacts: ArtifactsManager,
): Promise<Artifact[]> {
  const fqns = await hardhatArtifacts.getAllFullyQualifiedNames();
  const artifacts: Artifact[] = [];

  for (const fqn of fqns) {
    const hardhatArtifact = await hardhatArtifacts.readArtifact(fqn);
    const buildInfo = await hardhatArtifacts.getBuildInfo(fqn);

    if (buildInfo === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.SOLIDITY_TESTS.BUILD_INFO_NOT_FOUND_FOR_CONTRACT,
        {
          fqn,
        },
      );
    }

    const id = {
      name: hardhatArtifact.contractName,
      solcVersion: buildInfo.solcVersion,
      source: hardhatArtifact.sourceName,
    };

    const contract = {
      abi: JSON.stringify(hardhatArtifact.abi),
      bytecode: hardhatArtifact.bytecode,
      deployedBytecode: hardhatArtifact.deployedBytecode,
    };

    const artifact = { id, contract };
    artifacts.push(artifact);
  }

  return artifacts;
}

export async function isTestArtifact(
  root: string,
  artifact: Artifact,
): Promise<boolean> {
  const { source } = artifact.id;

  if (!source.endsWith(".t.sol")) {
    return false;
  }

  // NOTE: We also check whether the file exists in the workspace to filter out
  // the artifacts from node modules.
  const sourcePath = resolveFromRoot(root, source);
  const sourceExists = await exists(sourcePath);

  if (!sourceExists) {
    return false;
  }

  return true;
}
