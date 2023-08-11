import { SolidityParameterType } from "../../../types/module";

import { DeploymentExecutionStateFutureTypes } from "./execution-state";
import { NetworkInteraction } from "./network-interaction";

export type JournalMessage =
  | RunStartMessage
  | DeploymentExecutionStateInitializeMessage
  | NetworkInteractionRequestMessage;

export enum JournalMessageType {
  RUN_START = "RUN_START",
  NETWORK_INTERACTION_REQUEST = "NETWORK_INTERACTION_REQUEST",
  DEPLOYMENT_EXECUTION_STATE_INITIALIZE = "DEPLOYMENT_EXECUTION_STATE_INITIALIZE",
}

export interface RunStartMessage {
  type: JournalMessageType.RUN_START;
  chainId: number;
}

export interface DeploymentExecutionStateInitializeMessage {
  type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE;
  futureId: string;
  futureType: DeploymentExecutionStateFutureTypes;
  strategy: string;
  dependencies: string[];
  artifactFutureId: string;
  contractName: string;
  constructorArgs: SolidityParameterType[];
  libraries: Record<string, string>;
  value: bigint;
  from: string | undefined;
}

export interface NetworkInteractionRequestMessage {
  type: JournalMessageType.NETWORK_INTERACTION_REQUEST;
  futureId: string;
  networkInteraction: NetworkInteraction;
}
