import { DeploymentParameters } from "../../../../types/deployer";
import { Future, FutureType } from "../../../../types/module";
import { DeploymentState } from "../../types/deployment-state";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessage,
  JournalMessageType,
} from "../../types/messages";

import {
  resolveArgs,
  resolveFutureFrom,
  resolveLibraries,
  resolveValue,
} from "./future-resolvers";

export function buildInitializeMessageFor(
  future: Future,
  strategy: { name: string },
  deploymentState: DeploymentState,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): JournalMessage {
  switch (future.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
      const deploymentExecStateInit: DeploymentExecutionStateInitializeMessage =
        _extendBaseExecutionStateWith(
          JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            artifactFutureId: future.id,
            contractName: future.contractName,
            constructorArgs: resolveArgs(
              future.constructorArgs,
              deploymentState,
              deploymentParameters,
              accounts
            ),
            libraries: resolveLibraries(future.libraries, deploymentState),
            value: resolveValue(future.value, deploymentParameters),
            from: resolveFutureFrom(future.from, accounts),
          }
        );

      return deploymentExecStateInit;
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
      const libraryDeploymentInit: DeploymentExecutionStateInitializeMessage =
        _extendBaseExecutionStateWith(
          JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            artifactFutureId: future.id,
            contractName: future.contractName,
            constructorArgs: [],
            libraries: resolveLibraries(future.libraries, deploymentState),
            value: BigInt(0),
            from: resolveFutureFrom(future.from, accounts),
          }
        );

      return libraryDeploymentInit;
    case FutureType.NAMED_CONTRACT_CALL: {
      throw new Error(
        "Not implemented yet: FutureType.NAMED_CONTRACT_CALL case"
      );
    }
    case FutureType.NAMED_STATIC_CALL: {
      throw new Error("Not implemented yet: FutureType.NAMED_STATIC_CALL case");
    }
    case FutureType.NAMED_CONTRACT_AT: {
      throw new Error("Not implemented yet: FutureType.NAMED_CONTRACT_AT case");
    }
    case FutureType.ARTIFACT_CONTRACT_AT: {
      throw new Error(
        "Not implemented yet: FutureType.ARTIFACT_CONTRACT_AT case"
      );
    }
    case FutureType.READ_EVENT_ARGUMENT: {
      throw new Error(
        "Not implemented yet: FutureType.READ_EVENT_ARGUMENT case"
      );
    }
    case FutureType.SEND_DATA: {
      throw new Error("Not implemented yet: FutureType.SEND_DATA case");
    }
  }
}

function _extendBaseExecutionStateWith<
  FutureT extends Future,
  MessageT extends JournalMessageType,
  ExtensionT extends object
>(
  messageType: MessageT,
  future: FutureT,
  strategy: { name: string },
  extension: ExtensionT
): {
  type: MessageT;
  futureId: string;
  futureType: FutureT["type"];
  strategy: string;
  dependencies: string[];
} & ExtensionT {
  return {
    type: messageType,
    futureId: future.id,
    futureType: future.type,
    strategy: strategy.name,
    dependencies: [...future.dependencies].map((f) => f.id),
    ...extension,
  };
}
