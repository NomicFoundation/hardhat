import { assert } from "chai";

import {
  Artifact,
  ArtifactResolver,
  DeploymentResultContracts,
} from "../../src";
import { Deployer } from "../../src/new-api/internal/deployer";
import { MemoryJournal } from "../../src/new-api/internal/journal/memory-journal";
import { DeploymentResult } from "../../src/new-api/types/deployer";
import { DeploymentLoader } from "../../src/new-api/types/deployment-loader";
import {
  Journal,
  JournalableMessage,
  OnchainResultMessage,
} from "../../src/new-api/types/journal";
import { TransactionService } from "../../src/new-api/types/transaction-service";

export const exampleAccounts: string[] = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
];

export function assertInstanceOf<ObjectT>(
  obj: unknown,
  klass: new (...args: any[]) => ObjectT
): asserts obj is ObjectT {
  assert.instanceOf(obj, klass, `Not a valid instace of ${klass.name}`);
}

export function setupMockArtifactResolver(artifacts?: {
  [key: string]: Artifact;
}): ArtifactResolver {
  const fakeArtifact: Artifact = {
    abi: [],
    contractName: "",
    bytecode: "",
    linkReferences: {},
  };

  return {
    loadArtifact: async (contractName: string) => {
      if (artifacts === undefined) {
        return {
          ...fakeArtifact,
          contractName,
        };
      }

      const artifact = artifacts[contractName];

      if (artifact === undefined) {
        throw new Error(
          `No artifact set in test for that contractName ${contractName}`
        );
      }

      return artifacts[contractName];
    },
    getBuildInfo: async (_contractName: string) => {
      return { id: 12345 } as any;
    },
    resolvePath: async (contractName: string) => {
      return `${contractName}.json`;
    },
  };
}

export function setupMockDeploymentLoader(journal: Journal): DeploymentLoader {
  return {
    journal,
    recordDeployedAddress: async () => {},
    storeArtifact: async (futureId, _artifact) => {
      return `${futureId}.json`;
    },
    storeBuildInfo: async (buildInfo) => {
      return `build-info-${buildInfo.id}.json`;
    },
    loadArtifact: async (_storedArtifactPath) => {
      throw new Error("Not implemented");
    },
  };
}

export function setupMockTransactionService({
  responses,
}: {
  responses: { [key: string]: { [key: number]: OnchainResultMessage } };
}): TransactionService {
  return {
    onchain: async (request) => {
      const futureResults = responses[request.futureId];

      if (futureResults === undefined) {
        throw new Error(
          `Mock transaction service has no results recorded for future ${request.futureId}`
        );
      }

      const transactionResult = futureResults[request.executionId];

      if (transactionResult === undefined) {
        throw new Error(
          `Mock transaction service has no results recorded for transaction ${request.futureId}/${request.executionId}`
        );
      }

      return transactionResult;
    },
  };
}

export function setupDeployerWithMocks({
  journal = new MemoryJournal(),
  artifacts,
  transactionResponses,
}: {
  journal?: Journal;
  artifacts?: { [key: string]: Artifact };
  transactionResponses?: {
    [key: string]: { [key: number]: OnchainResultMessage };
  };
}): Deployer {
  const mockArtifactResolver = setupMockArtifactResolver(artifacts);
  const mockDeploymentLoader = setupMockDeploymentLoader(journal);
  const mockTransactionService = setupMockTransactionService({
    responses: transactionResponses ?? {},
  });

  return new Deployer({
    artifactResolver: mockArtifactResolver,
    deploymentLoader: mockDeploymentLoader,
    transactionService: mockTransactionService,
  });
}

export async function accumulateMessages(
  journal: Journal
): Promise<JournalableMessage[]> {
  const messages: JournalableMessage[] = [];

  for await (const message of journal.read()) {
    messages.push(message);
  }

  return messages;
}

export function assertDeploymentFailure(
  result: DeploymentResult,
  expectedErrors: {
    [key: string]: Error;
  }
) {
  assert.isDefined(result);

  if (result.status !== "failure") {
    assert.fail("result expected to be failure");
  }

  assert.deepStrictEqual(result.errors, expectedErrors);
}

export function assertDeploymentSuccess(
  result: DeploymentResult,
  expectedContracts: DeploymentResultContracts
) {
  assert.isDefined(result);

  if (result.status !== "success") {
    assert.fail("result expected to be success");
  }

  assert.deepStrictEqual(result.contracts, expectedContracts);
}
