import { assert } from "chai";

import { Artifact, ArtifactResolver } from "../src";
import { DeploymentLoader } from "../src/internal/deployment-loader/types";
import { Journal } from "../src/internal/journal/types";

export const exampleAccounts: string[] = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
];

export function assertValidationError(errors: string[], expectedError: string) {
  assert.includeMembers(
    errors.map((e) => e.split(/IGN\d+: /)[1]),
    [expectedError]
  );
}

export function assertInstanceOf<ObjectT>(
  obj: unknown,
  klass: new (...args: any[]) => ObjectT
): asserts obj is ObjectT {
  assert.instanceOf(obj, klass, `Not a valid instance of ${klass.name}`);
}

export const fakeArtifact: Artifact = {
  abi: [],
  contractName: "",
  sourceName: "",
  bytecode: "",
  linkReferences: {},
};

export function setupMockArtifactResolver(artifacts?: {
  [key: string]: Artifact;
}): ArtifactResolver {
  return {
    loadArtifact: async (contractName: string) => {
      if (artifacts?.[contractName] === undefined) {
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
  };
}

export function setupMockDeploymentLoader(
  journal: Journal,
  deployedAddresses?: { [key: string]: string }
): DeploymentLoader {
  const storedArtifacts: { [key: string]: Artifact } = {};
  const storedDeployedAddresses: { [key: string]: string } =
    deployedAddresses ?? {};

  return {
    recordToJournal: async (message) => {
      journal.record(message);
    },
    readFromJournal: () => {
      return journal.read();
    },
    recordDeployedAddress: async (futureId, contractAddress) => {
      storedDeployedAddresses[futureId] = contractAddress;
    },
    storeUserProvidedArtifact: async (artifactId, artifact) => {
      storedArtifacts[artifactId] = artifact;
    },
    storeNamedArtifact: async (artifactId, _contractName, artifact) => {
      storedArtifacts[artifactId] = artifact;
    },
    storeBuildInfo: async () => {},
    loadArtifact: async (artifactId: string) => {
      const artifact = storedArtifacts[artifactId];

      if (artifact === undefined) {
        throw new Error(`Artifact not stored for ${artifactId}`);
      }

      return artifact;
    },
  };
}
