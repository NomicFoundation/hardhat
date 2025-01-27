import type { DeploymentParameters } from "../../../../types/deploy";
import type { Future } from "../../../../types/module";
import type { DeploymentLoader } from "../../../deployment-loader/types";
import type { DeploymentState } from "../../types/deployment-state";
import type { ConcreteExecutionConfig } from "../../types/execution-state";
import type { ExecutionStrategy } from "../../types/execution-strategy";
import type {
  CallExecutionStateInitializeMessage,
  ContractAtExecutionStateInitializeMessage,
  DeploymentExecutionStateInitializeMessage,
  EncodeFunctionCallExecutionStateInitializeMessage,
  JournalMessage,
  ReadEventArgExecutionStateInitializeMessage,
  SendDataExecutionStateInitializeMessage,
  StaticCallExecutionStateInitializeMessage,
} from "../../types/messages";

import { FutureType } from "../../../../types/module";
import { JournalMessageType } from "../../types/messages";

import {
  resolveAddressForContractFuture,
  resolveAddressLike,
  resolveArgs,
  resolveEncodeFunctionCallResult,
  resolveFutureData,
  resolveFutureFrom,
  resolveLibraries,
  resolveReadEventArgumentResult,
  resolveSendToAddress,
  resolveValue,
} from "./future-resolvers";

export async function buildInitializeMessageFor(
  future: Future,
  deploymentState: DeploymentState,
  strategy: ExecutionStrategy,
  deploymentParameters: DeploymentParameters,
  deploymentLoader: DeploymentLoader,
  accounts: string[],
  defaultSender: string,
): Promise<JournalMessage> {
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.CONTRACT_DEPLOYMENT:
      const deploymentExecStateInit: DeploymentExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy.name,
          strategy.config,
          {
            futureType: future.type,
            artifactId: future.id,
            contractName: future.contractName,
            constructorArgs: resolveArgs(
              future.constructorArgs,
              deploymentState,
              deploymentParameters,
              accounts,
            ),
            libraries: resolveLibraries(future.libraries, deploymentState),
            value: resolveValue(
              future.value,
              deploymentParameters,
              deploymentState,
              accounts,
            ),
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          },
        );

      return deploymentExecStateInit;
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
    case FutureType.LIBRARY_DEPLOYMENT:
      const libraryDeploymentInit: DeploymentExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy.name,
          strategy.config,
          {
            futureType: future.type,
            artifactId: future.id,
            contractName: future.contractName,
            constructorArgs: [],
            libraries: resolveLibraries(future.libraries, deploymentState),
            value: BigInt(0),
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          },
        );

      return libraryDeploymentInit;
    case FutureType.CONTRACT_CALL: {
      const namedContractCallInit: CallExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE,
          future,
          strategy.name,
          strategy.config,
          {
            args: resolveArgs(
              future.args,
              deploymentState,
              deploymentParameters,
              accounts,
            ),
            functionName: future.functionName,
            contractAddress: resolveAddressForContractFuture(
              future.contract,
              deploymentState,
            ),
            artifactId: future.contract.id,
            value: resolveValue(
              future.value,
              deploymentParameters,
              deploymentState,
              accounts,
            ),
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          },
        );

      return namedContractCallInit;
    }
    case FutureType.STATIC_CALL: {
      const namedStaticCallInit: StaticCallExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
          future,
          strategy.name,
          strategy.config,
          {
            args: resolveArgs(
              future.args,
              deploymentState,
              deploymentParameters,
              accounts,
            ),
            nameOrIndex: future.nameOrIndex,
            functionName: future.functionName,
            contractAddress: resolveAddressForContractFuture(
              future.contract,
              deploymentState,
            ),
            artifactId: future.contract.id,
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          },
        );

      return namedStaticCallInit;
    }
    case FutureType.ENCODE_FUNCTION_CALL: {
      const args = resolveArgs(
        future.args,
        deploymentState,
        deploymentParameters,
        accounts,
      );

      const result = await resolveEncodeFunctionCallResult(
        future.contract.id,
        future.functionName,
        args,
        deploymentLoader,
      );

      const encodeFunctionCallInit: EncodeFunctionCallExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.ENCODE_FUNCTION_CALL_EXECUTION_STATE_INITIALIZE,
          future,
          strategy.name,
          strategy.config,
          {
            args,
            functionName: future.functionName,
            artifactId: future.contract.id,
            result,
          },
        );

      return encodeFunctionCallInit;
    }
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
    case FutureType.CONTRACT_AT: {
      const contractAtInit: ContractAtExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy.name,
          strategy.config,
          {
            futureType: future.type,
            contractName: future.contractName,
            contractAddress: resolveAddressLike(
              future.address,
              deploymentState,
              deploymentParameters,
              accounts,
            ),
            artifactId: future.id,
          },
        );

      return contractAtInit;
    }
    case FutureType.READ_EVENT_ARGUMENT: {
      const { txToReadFrom, emitterAddress, result } =
        await resolveReadEventArgumentResult(
          future.futureToReadFrom,
          future.emitter,
          future.eventName,
          future.eventIndex,
          future.nameOrIndex,
          deploymentState,
          deploymentLoader,
        );

      const readEventArgInit: ReadEventArgExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy.name,
          strategy.config,
          {
            artifactId: future.emitter.id,
            eventName: future.eventName,
            nameOrIndex: future.nameOrIndex,
            eventIndex: future.eventIndex,
            txToReadFrom,
            emitterAddress,
            result,
          },
        );

      return readEventArgInit;
    }
    case FutureType.SEND_DATA:
      const sendDataInit: SendDataExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
          future,
          strategy.name,
          strategy.config,
          {
            to: resolveSendToAddress(
              future.to,
              deploymentState,
              deploymentParameters,
              accounts,
            ),
            value: resolveValue(
              future.value,
              deploymentParameters,
              deploymentState,
              accounts,
            ),
            data: resolveFutureData(future.data, deploymentState),
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          },
        );

      return sendDataInit;
  }
}

function _extendBaseInitWith<
  FutureT extends Future,
  MessageT extends JournalMessageType,
  ExtensionT extends object,
>(
  messageType: MessageT,
  future: FutureT,
  strategy: string,
  strategyConfig: ConcreteExecutionConfig,
  extension: ExtensionT,
): {
  type: MessageT;
  futureId: string;
  strategy: string;
  strategyConfig: ConcreteExecutionConfig;
  dependencies: string[];
} & ExtensionT {
  return {
    type: messageType,
    futureId: future.id,
    strategy,
    strategyConfig,
    dependencies: [...future.dependencies].map((f) => f.id),
    ...extension,
  };
}
