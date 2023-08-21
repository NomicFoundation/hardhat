import { DeploymentParameters } from "../../../../types/deployer";
import {
  Future,
  FutureType,
  ModuleParameterRuntimeValue,
} from "../../../../types/module";
import { assertIgnitionInvariant } from "../../../utils/assertions";
import { resolveModuleParameter } from "../../../utils/resolve-module-parameter";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessage,
  JournalMessageType,
} from "../../types/messages";

export function buildInitializeMessageFor(
  future: Future,
  strategy: { name: string },
  deploymentParameters: DeploymentParameters
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
          constructorArgs: [],
          libraries: {},
          value: _resolveValue(future.value, deploymentParameters),
          from: future.from as string,
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

function _resolveValue(
  givenValue: bigint | ModuleParameterRuntimeValue<bigint>,
  deploymentParameters: DeploymentParameters
): bigint {
  if (typeof givenValue === "bigint") {
    return givenValue;
  }

  const moduleParam = resolveModuleParameter(givenValue, {
    deploymentParameters,
  });

  assertIgnitionInvariant(
    typeof moduleParam === "bigint",
    "Module parameter used as value must be a bigint"
  );

  return moduleParam;
}
