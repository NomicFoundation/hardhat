import { Future, FutureType } from "../../../../types/module";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessage,
  JournalMessageType,
} from "../../types/messages";

export function buildInitializeMessageFor(future: Future): JournalMessage {
  switch (future.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT: {
      const namedContractInitMessage: DeploymentExecutionStateInitializeMessage =
        {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          futureId: future.id,
          futureType: future.type,
          strategy: "basic",
          dependencies: [],
          artifactFutureId: future.id,
          contractName: future.contractName,
          constructorArgs: [],
          libraries: {},
          value: BigInt(0),
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
