import { assert } from "chai";

import {
  Artifact,
  ArtifactResolver,
  BuildInfo,
  DeploymentParameters,
} from "../../src/index.js";
import { DeploymentLoader } from "../../src/internal/deployment-loader/types.js";
import { DeploymentState } from "../../src/internal/execution/types/deployment-state.js";
import {
  ConcreteExecutionConfig,
  ExecutionState,
} from "../../src/internal/execution/types/execution-state.js";
import { JournalMessage } from "../../src/internal/execution/types/messages.js";
import { getDefaultSender } from "../../src/internal/execution/utils/get-default-sender.js";
import { Reconciler } from "../../src/internal/reconciliation/reconciler.js";
import { ReconciliationResult } from "../../src/internal/reconciliation/types.js";
import { IgnitionModule } from "../../src/types/module.js";
import { exampleAccounts } from "../helpers.js";

export const oneAddress = "0x1111111111111111111111111111111111111111";
export const twoAddress = "0x2222222222222222222222222222222222222222";

export const mockArtifact: Artifact = {
  _format: "hh-sol-artifact-1",
  contractName: "Contract1",
  sourceName: "",
  bytecode: "0x",
  deployedBytecode: "0x",
  linkReferences: {},
  deployedLinkReferences: {},
  abi: [],
};

class MockDeploymentLoader implements DeploymentLoader {
  public async recordToJournal(_: JournalMessage): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public async *readFromJournal(): AsyncGenerator<
    JournalMessage,
    any,
    unknown
  > {}

  public async loadArtifact(_artifactId: string): Promise<Artifact> {
    return mockArtifact;
  }

  public async storeUserProvidedArtifact(
    _futureId: string,
    _artifact: Artifact,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public storeNamedArtifact(
    _futureId: string,
    _contractName: string,
    _artifact: Artifact,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public storeBuildInfo(
    _futureId: string,
    _buildInfo: BuildInfo,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public recordDeployedAddress(
    _futureId: string,
    _contractAddress: string,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public emitDeploymentBatchEvent(_batches: string[][]): void {
    throw new Error("Method not implemented.");
  }
}

class MockArtifactResolver implements ArtifactResolver {
  public async loadArtifact(_contractName: string): Promise<Artifact> {
    return mockArtifact;
  }

  public async getBuildInfo(
    _contractName: string,
  ): Promise<BuildInfo | undefined> {
    throw new Error("Method not implemented.");
  }
}

export class ArtifactMapResolver extends MockArtifactResolver {
  constructor(
    private readonly _artifactMap: { [artifactId: string]: Artifact } = {},
  ) {
    super();
  }

  public override async loadArtifact(contractName: string): Promise<Artifact> {
    return this._artifactMap[contractName];
  }
}

export class ArtifactMapDeploymentLoader extends MockDeploymentLoader {
  constructor(
    private readonly _artifactMap: { [artifactId: string]: Artifact } = {},
  ) {
    super();
  }

  public override async loadArtifact(contractName: string): Promise<Artifact> {
    return this._artifactMap[contractName];
  }
}

export function createDeploymentState(
  ...exStates: ExecutionState[]
): DeploymentState {
  return {
    chainId: 123,
    executionStates: Object.fromEntries(exStates.map((s) => [s.id, s])),
  };
}

export async function reconcile(
  ignitionModule: IgnitionModule,
  deploymentState: DeploymentState,
  deploymentLoader: DeploymentLoader = new MockDeploymentLoader(),
  artifactLoader: ArtifactResolver = new MockArtifactResolver(),
  deploymentParameters: DeploymentParameters = {},
  strategy: string = "basic",
  strategyConfig: ConcreteExecutionConfig = {},
): Promise<ReconciliationResult> {
  const reconiliationResult = Reconciler.reconcile(
    ignitionModule,
    deploymentState,
    deploymentParameters,
    exampleAccounts,
    deploymentLoader,
    artifactLoader,
    getDefaultSender(exampleAccounts),
    strategy,
    strategyConfig,
  );

  return reconiliationResult;
}

export function assertNoWarningsOrErrors(
  reconciliationResult: ReconciliationResult,
): void {
  assert.equal(
    reconciliationResult.reconciliationFailures.length,
    0,
    `Unreconcilied futures found: \n${JSON.stringify(
      reconciliationResult.reconciliationFailures,
      undefined,
      2,
    )}`,
  );
  assert.equal(
    reconciliationResult.missingExecutedFutures.length,
    0,
    `Missing futures found: \n${JSON.stringify(
      reconciliationResult.missingExecutedFutures,
      undefined,
      2,
    )}`,
  );
}

export async function assertSuccessReconciliation(
  ignitionModule: IgnitionModule,
  deploymentState: DeploymentState,
): Promise<void> {
  const reconciliationResult = await reconcile(ignitionModule, deploymentState);

  assertNoWarningsOrErrors(reconciliationResult);
}
