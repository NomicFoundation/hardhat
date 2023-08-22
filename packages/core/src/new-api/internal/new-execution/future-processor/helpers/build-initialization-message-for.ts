import { DeploymentParameters } from "../../../../types/deployer";
import { Future, FutureType } from "../../../../types/module";
import { DeploymentState } from "../../types/deployment-state";
import {
  CallExecutionStateInitializeMessage,
  ContractAtExecutionStateInitializeMessage,
  DeploymentExecutionStateInitializeMessage,
  JournalMessage,
  JournalMessageType,
  SendDataExecutionStateInitializeMessage,
  StaticCallExecutionStateInitializeMessage,
} from "../../types/messages";

import {
  resolveAddressForContract,
  resolveAddressForContractAtAddress,
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
            futureType: future.type,
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
            futureType: future.type,
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
      const namedContractCallInit: CallExecutionStateInitializeMessage =
        _extendBaseExecutionStateWith(
          JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            args: resolveArgs(
              future.args,
              deploymentState,
              deploymentParameters,
              accounts
            ),
            functionName: future.functionName,
            contractAddress: resolveAddressForContract(
              future.contract,
              deploymentState
            ),
            artifactFutureId: future.contract.id,
            value: resolveValue(future.value, deploymentParameters),
            from: resolveFutureFrom(future.from, accounts),
          }
        );

      return namedContractCallInit;
    }
    case FutureType.NAMED_STATIC_CALL: {
      const namedStaticCallInit: StaticCallExecutionStateInitializeMessage =
        _extendBaseExecutionStateWith(
          JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            args: resolveArgs(
              future.args,
              deploymentState,
              deploymentParameters,
              accounts
            ),
            functionName: future.functionName,
            contractAddress: resolveAddressForContract(
              future.contract,
              deploymentState
            ),
            artifactFutureId: future.contract.id,
            from: resolveFutureFrom(future.from, accounts),
          }
        );

      return namedStaticCallInit;
    }
    case FutureType.NAMED_CONTRACT_AT:
    case FutureType.ARTIFACT_CONTRACT_AT: {
      const contractAtInit: ContractAtExecutionStateInitializeMessage =
        _extendBaseExecutionStateWith(
          JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            futureType: future.type,
            contractName: future.contractName,
            contractAddress: resolveAddressForContractAtAddress(
              future.address,
              deploymentState,
              deploymentParameters
            ),
            artifactFutureId: future.id,
          }
        );

      return contractAtInit;
    }
    case FutureType.READ_EVENT_ARGUMENT: {
      throw new Error(
        "Not implemented yet: FutureType.READ_EVENT_ARGUMENT case"
      );
    }
    case FutureType.SEND_DATA:
      const sendDataInit: SendDataExecutionStateInitializeMessage =
        _extendBaseExecutionStateWith(
          JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            to: resolveAddressForContractAtAddress(
              future.to,
              deploymentState,
              deploymentParameters
            ),
            value: resolveValue(future.value, deploymentParameters),
            data: future.data ?? "0x",
            from: resolveFutureFrom(future.from, accounts),
          }
        );

      return sendDataInit;
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
  strategy: string;
  dependencies: string[];
} & ExtensionT {
  return {
    type: messageType,
    futureId: future.id,
    strategy: strategy.name,
    dependencies: [...future.dependencies].map((f) => f.id),
    ...extension,
  };
}
