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
    case FutureType.NAMED_CONTRACT_DEPLOYMENT: {
      const namedContractInitMessage: DeploymentExecutionStateInitializeMessage =
        {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          futureId: future.id,
          futureType: future.type,
          strategy: strategy.name,
          dependencies: [...future.dependencies].map((f) => f.id),
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
        };

      return namedContractInitMessage;
    }
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT: {
      throw new Error(
        "Not implemented yet: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT case"
      );
    }
    case FutureType.NAMED_LIBRARY_DEPLOYMENT: {
      throw new Error(
        "Not implemented yet: FutureType.NAMED_LIBRARY_DEPLOYMENT case"
      );
    }
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT: {
      throw new Error(
        "Not implemented yet: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT case"
      );
    }
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
