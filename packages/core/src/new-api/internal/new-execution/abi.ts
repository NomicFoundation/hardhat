import type {
  EventFragment,
  Fragment,
  FunctionFragment,
  Interface,
  ParamType,
  Result,
} from "ethers";

import {
  IgnitionValidationError,
  UnsupportedOperationError,
} from "../../../errors";
import { Artifact } from "../../types/artifact";
import { ArgumentType, SolidityParameterType } from "../../types/module";
import { assertIgnitionInvariant } from "../utils/assertions";

import { linkLibraries } from "./libraries";
import {
  EvmExecutionResultTypes,
  EvmTuple,
  EvmValue,
  FailedEvmExecutionResult,
  InvalidResultError,
  RevertWithCustomError,
  RevertWithInvalidData,
  RevertWithPanicCode,
  RevertWithReason,
  SuccessfulEvmExecutionResult,
} from "./types/evm-execution";
import { TransactionReceipt } from "./types/jsonrpc";

const REVERT_REASON_SIGNATURE = "0x08c379a0";
const PANIC_CODE_SIGNATURE = "0x4e487b71";
const PANIC_CODE_NAMES: { [key: number]: string | undefined } = {
  [0x00]: "GENERIC_PANIC",
  [0x01]: "ASSERT_FALSE",
  [0x11]: "OVERFLOW",
  [0x12]: "DIVIDE_BY_ZERO",
  [0x21]: "ENUM_RANGE_ERROR",
  [0x22]: "BAD_STORAGE_DATA",
  [0x31]: "STACK_UNDERFLOW",
  [0x32]: "ARRAY_RANGE_ERROR",
  [0x41]: "OUT_OF_MEMORY",
  [0x51]: "UNINITIALIZED_FUNCTION_CALL",
};

/**
 * Links the libraries in the artifact's deployment bytecode, encodes the constructor
 * arguments and returns the result, which can be used as the `data` field of a
 * deployment.
 */
export function encodeArtifactDeploymentData(
  artifact: Artifact,
  args: SolidityParameterType[],
  libraries: { [libraryName: string]: string }
): string {
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(artifact.abi);

  const linkedBytecode = linkLibraries(artifact, libraries);
  const encodedArgs = iface.encodeDeploy(args);

  return linkedBytecode + encodedArgs.slice(2);
}

/**
 * Encodes a function call for the given artifact and function name.
 */
export function encodeArtifactFunctionCall(
  artifact: Artifact,
  functionName: string,
  args: SolidityParameterType[]
): string {
  validateArtifactFunctionName(artifact, functionName);

  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(artifact.abi);

  const functionFragment = getFunctionFragment(iface, functionName);
  return iface.encodeFunctionData(functionFragment, args);
}

/**
 * Decodes a custom error from the given return data, if it's recognized
 * as one of the artifact's custom errors.
 */
export function decodeArtifactCustomError(
  artifact: Artifact,
  returnData: string
): RevertWithCustomError | RevertWithInvalidData | undefined {
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = ethers.Interface.from(artifact.abi);
  const errorFragment = iface.fragments
    .filter(ethers.Fragment.isError)
    .find((ef) => returnData.startsWith(ef.selector));

  if (errorFragment === undefined) {
    return undefined;
  }

  try {
    const decoded = iface.decodeErrorResult(errorFragment, returnData);

    return {
      type: EvmExecutionResultTypes.REVERT_WITH_CUSTOM_ERROR,
      errorName: errorFragment.name,
      args: ethersResultIntoEvmTuple(decoded, errorFragment.inputs),
    };
  } catch {
    return {
      type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}

/**
 * Decode the result of a successful function call.
 */
export function decodeArtifactFunctionCallResult(
  artifact: Artifact,
  functionName: string,
  returnData: string
): InvalidResultError | SuccessfulEvmExecutionResult {
  validateArtifactFunctionName(artifact, functionName);

  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = ethers.Interface.from(artifact.abi);
  const functionFragment = getFunctionFragment(iface, functionName);

  try {
    const decoded = iface.decodeFunctionResult(functionFragment, returnData);
    const values = ethersResultIntoEvmTuple(decoded, functionFragment.outputs);

    return { type: EvmExecutionResultTypes.SUCESSFUL_RESULT, values };
  } catch {
    return {
      type: EvmExecutionResultTypes.INVALID_RESULT_ERROR,
      data: returnData,
    };
  }
}

/**
 * Validates that a function is valid for the given artifact. That means:
 *  - It's a valid function name
 *    - The function name exists in the artifact's ABI
 *    - If the function is not overlaoded, its bare name is used.
 *    - If the function is overloaded, the function name is includes the argument types
 *      in parentheses.
 * - The function has the correct number of arguments
 * - The function is has a pure or view state mutability
 */
export function validateArtifactFunction(
  artifact: Artifact,
  contractName: string,
  functionName: string,
  args: ArgumentType[]
) {
  validateOverloadedName(artifact, functionName, false);

  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(artifact.abi);
  const fragment = getFunctionFragment(iface, functionName);

  // Check that the number of arguments is correct
  if (fragment.inputs.length !== args.length) {
    throw new IgnitionValidationError(
      `Function ${functionName} in contract ${contractName} expects ${fragment.inputs.length} arguments but ${args.length} were given`
    );
  }

  // CHeck that the function is pure or view, which is required for a static call
  if (!fragment.constant) {
    throw new IgnitionValidationError(
      `Function ${functionName} in contract ${contractName} is not 'pure' or 'view' and cannot be statically called`
    );
  }
}

/**
 * Validates that a function name is valid for the given artifact. That means:
 *  - It's a valid function name
 *  - The function name exists in the artifact's ABI
 *  - If the function is not overlaoded, its bare name is used.
 *  - If the function is overloaded, the function name is includes the argument types
 *    in parentheses.
 */
export function validateArtifactFunctionName(
  artifact: Artifact,
  functionName: string
) {
  validateOverloadedName(artifact, functionName, false);
}

/**
 * Validates that the event exists in the artifact, it's name is valid, handles overloads
 * correctly, and that the arugment exists in the event.
 *
 * @param emitterArtifact The artifact of the contract emitting the event.
 * @param eventName The name of the event.
 * @param argument The argument name or index.
 */
export function validateArtifactEventArgumentParams(
  emitterArtifact: Artifact,
  eventName: string,
  argument: string | number
) {
  validateOverloadedName(emitterArtifact, eventName, true);
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(emitterArtifact.abi);

  const eventFragment = getEventFragment(iface, eventName);

  if (typeof argument === "string") {
    for (const input of eventFragment.inputs) {
      if (input.name === argument) {
        return;
      }
    }

    throw new IgnitionValidationError(
      `Event ${eventName} of contract ${emitterArtifact.contractName} has no argument named ${argument}`
    );
  }

  if (eventFragment.inputs.length <= argument) {
    throw new IgnitionValidationError(
      `Event ${eventName} of contract ${emitterArtifact.contractName} has only ${eventFragment.inputs.length} arguments, but argument ${argument} was requested`
    );
  }
}

/**
 * Returns the value of an argument in an event emitted by the contract
 * at emitterAddress with a certain artifact.
 *
 * @param receipt The receipt of the transaction that emitted the event.
 * @param emitterArtifact The artifact of the contract emitting the event.
 * @param emitterAddress The address of the contract emitting the event.
 * @param eventName The name of the event. It MUST be validated first.
 * @param eventIndex The index of the event, in case there are multiple events emitted with the same name
 * @param argument The name or index of the argument to extract from the event.
 * @returns The EvmValue of the argument.
 */
export function getEventArgumentFromReceipt(
  receipt: TransactionReceipt,
  emitterArtifact: Artifact,
  emitterAddress: string,
  eventName: string,
  eventIndex: number,
  argument: string | number
): EvmValue {
  const emitterLogs = receipt.logs.filter((l) => l.address === emitterAddress);

  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(emitterArtifact.abi);

  const eventFragment = getEventFragment(iface, eventName);
  const eventLogs = emitterLogs.filter(
    (l) => l.topics[0] === eventFragment.topicHash
  );

  const log = eventLogs[eventIndex];

  const ethersResult = iface.decodeEventLog(eventFragment, log.data);

  const evmTuple = ethersResultIntoEvmTuple(ethersResult, eventFragment.inputs);

  if (typeof argument === "string") {
    return evmTuple.named[argument];
  }

  return evmTuple.positional[argument];
}

/**
 * Decodes an error from a failed evm execution.
 *
 * @param returnData The data, as returned by the JSON-RPC.
 * @param customErrorReported A value indicating if the JSON-RPC error
 *  reported that it was due to a custom error.
 * @param decodeCustomError A function that decodes custom errors, returning
 *  `RevertWithCustomError` if succesfully decoded, `RevertWithInvalidData`
 *  if a custom error was recognized but couldn't be decoded, and `undefined`
 *  it it wasn't recognized.
 * @returns A `FailedEvmExecutionResult` with the decoded error.
 */
export function decodeError(
  returnData: string,
  customErrorReported: boolean,
  decodeCustomError?: (
    returnData: string
  ) => RevertWithCustomError | RevertWithInvalidData | undefined
): FailedEvmExecutionResult {
  if (returnData === "0x") {
    return { type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON };
  }

  const revertWithReasonError = tryToDecodeReason(returnData);
  if (revertWithReasonError !== undefined) {
    return revertWithReasonError;
  }

  const revertWithPanicCodeError = tryToDecodePanicCode(returnData);
  if (revertWithPanicCodeError !== undefined) {
    return revertWithPanicCodeError;
  }

  if (decodeCustomError !== undefined) {
    const decodedCustomError = decodeCustomError(returnData);
    if (decodedCustomError !== undefined) {
      return decodedCustomError;
    }
  }

  if (customErrorReported === true) {
    return {
      type: EvmExecutionResultTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR,
      signature: returnData.slice(0, 10),
      data: returnData,
    };
  }

  return {
    type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR,
    signature: returnData.slice(0, 10),
    data: returnData,
  };
}

function tryToDecodeReason(
  returnData: string
): RevertWithReason | RevertWithInvalidData | undefined {
  if (!returnData.startsWith(REVERT_REASON_SIGNATURE)) {
    return undefined;
  }

  const { ethers } = require("ethers") as typeof import("ethers");
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  try {
    const [reason] = abiCoder.decode(
      ["string"],
      Buffer.from(returnData.slice(REVERT_REASON_SIGNATURE.length), "hex")
    );

    return {
      type: EvmExecutionResultTypes.REVERT_WITH_REASON,
      message: reason,
    };
  } catch {
    return {
      type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}

function tryToDecodePanicCode(
  returnData: string
): RevertWithPanicCode | RevertWithInvalidData | undefined {
  if (!returnData.startsWith(PANIC_CODE_SIGNATURE)) {
    return undefined;
  }

  const { ethers } = require("ethers") as typeof import("ethers");
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  try {
    const decoded = abiCoder.decode(
      ["uint256"],
      Buffer.from(returnData.slice(REVERT_REASON_SIGNATURE.length), "hex")
    );

    const panicCode = Number(decoded[0]);

    const panicName = PANIC_CODE_NAMES[panicCode];

    if (panicName === undefined) {
      return {
        type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      };
    }

    return {
      type: EvmExecutionResultTypes.REVERT_WITH_PANIC_CODE,
      panicCode,
      panicName,
    };
  } catch {
    return {
      type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}

function ethersValueIntoEvmValue(
  ethersValue: any,
  paramType: ParamType
): EvmValue {
  const { ethers } = require("ethers") as typeof import("ethers");

  if (typeof ethersValue === "bigint") {
    return ethersValue;
  }

  if (typeof ethersValue === "string") {
    return ethersValue;
  }

  if (typeof ethersValue === "number") {
    return BigInt(ethersValue);
  }

  if (typeof ethersValue === "boolean") {
    return ethersValue;
  }

  if (ethersValue instanceof ethers.Result) {
    if (paramType.baseType === "array") {
      assertIgnitionInvariant(
        paramType.arrayChildren !== null,
        `[ethers.js values decoding] arrayChildren must be defined for array ${paramType.type}`
      );

      return ethersResultIntoEvmValueArray(
        ethersValue,
        paramType.arrayChildren
      );
    }

    assertIgnitionInvariant(
      paramType.components !== null,
      `[ethers.js values decoding] components must be defined for tuple ${paramType.type}`
    );

    return ethersResultIntoEvmTuple(ethersValue, paramType.components);
  }

  throw new UnsupportedOperationError(
    `Ignition can't decode ethers.js value of type ${
      paramType.type
    }: ${JSON.stringify(ethersValue, undefined, 2)}`
  );
}

function ethersResultIntoEvmValueArray(
  result: Result,
  elementParamType: ParamType
): EvmValue[] {
  return Array.from(result).map((ethersValue) =>
    ethersValueIntoEvmValue(ethersValue, elementParamType)
  );
}

function ethersResultIntoEvmTuple(
  result: Result,
  paramsParamType: readonly ParamType[]
): EvmTuple {
  const positional: EvmValue[] = [];
  const named: Record<string, EvmValue> = {};

  for (const [i, param] of paramsParamType.entries()) {
    const transformedValue = ethersValueIntoEvmValue(result[i], param);

    positional[i] = transformedValue;

    if (param.name !== "") {
      named[param.name] = transformedValue;
    }
  }

  return { positional, named };
}

/**
 * Returns a function fragment for the given function name in the given interface.
 *
 * @param iface The interface to search in.
 * @param functionName The function name to search for. MUST be validated first.
 */
function getFunctionFragment(
  iface: Interface,
  functionName: string
): FunctionFragment {
  const { ethers } = require("ethers") as typeof import("ethers");

  const fragment = iface.fragments
    .filter(ethers.Fragment.isFunction)
    .find(
      (fr) =>
        fr.name === functionName ||
        getFunctionNameWithParams(fr) === functionName
    );

  assertIgnitionInvariant(
    fragment !== undefined,
    "Called getFunctionFragment with an invalid function name"
  );

  return fragment;
}

/**
 * Returns an event fragment for the given event name in the given interface.
 *
 * @param iface The interface to search in.
 * @param eventName The event name to search for. MUST be validated first.
 */
function getEventFragment(iface: Interface, eventName: string): EventFragment {
  const { ethers } = require("ethers") as typeof import("ethers");

  // TODO: Add support for event overloading
  const fragment = iface.fragments
    .filter(ethers.Fragment.isEvent)
    .find(
      (fr) => fr.name === eventName || getEventNameWithParams(fr) === eventName
    );

  assertIgnitionInvariant(
    fragment !== undefined,
    "Called getEventFragment with an invalid event name"
  );

  return fragment;
}

function getFunctionNameWithParams(functionFragment: FunctionFragment): string {
  return functionFragment.format("sighash");
}

function getEventNameWithParams(eventFragment: EventFragment): string {
  return eventFragment.format("sighash");
}

/**
 * Returtns the bare name of a function or event name. The bare name is the
 * function or event name without the parameter types.
 *
 * @param functionOrEventName The name, either with or without parames.
 * @returns The bare name, or undefined if the given name is not valid.
 */
function getBareName(functionOrEventName: string): string | undefined {
  const NAME_REGEX = /^[_\\$a-zA-Z][_\\$a-zA-Z0-9]*(\(.*\))?$/;

  if (functionOrEventName.match(NAME_REGEX) === null) {
    return undefined;
  }

  return functionOrEventName.includes("(")
    ? functionOrEventName.substring(0, functionOrEventName.indexOf("("))
    : functionOrEventName;
}

function validateOverloadedName(
  artifact: Artifact,
  name: string,
  isEvent: boolean
) {
  const eventOrFunction = isEvent ? "event" : "function";
  const eventOrFunctionCapitalized = isEvent ? "Event" : "Function";

  const bareName = getBareName(name);

  if (bareName === undefined) {
    throw new IgnitionValidationError(
      `Invalid ${eventOrFunction} name "${name}"`
    );
  }

  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(artifact.abi);

  const fragments = iface.fragments
    .filter((f: Fragment): f is EventFragment | FunctionFragment => {
      if (isEvent) {
        return ethers.Fragment.isEvent(f);
      }

      return ethers.Fragment.isFunction(f);
    })
    .filter((fragment) => fragment.name === bareName);

  if (fragments.length === 0) {
    throw new IgnitionValidationError(
      `${eventOrFunctionCapitalized} "${name}" not found in contract ${artifact.contractName}`
    );
  }

  // If it is not overloaded we force the user to use the bare name
  // because having a single representation is more friendly with our reconciliation
  // process.
  if (fragments.length === 1) {
    if (bareName !== name) {
      throw new IgnitionValidationError(
        `${eventOrFunctionCapitalized} name "${name}" used for contract ${artifact.contractName}, but it's not overloaded. Use "${bareName}" instead.`
      );
    }

    return;
  }

  const normalizedNames = fragments.map((f) => {
    if (ethers.Fragment.isEvent(f)) {
      return getEventNameWithParams(f);
    }

    return getFunctionNameWithParams(f);
  });

  const normalizedNameList = normalizedNames.map((nn) => `* ${nn}`).join("\n");

  if (bareName === name) {
    throw new IgnitionValidationError(
      `${eventOrFunctionCapitalized} "${name}" is overloaded in contract ${artifact.contractName}. Please use one of these names instead:

${normalizedNameList}`
    );
  }

  if (!normalizedNames.includes(name)) {
    throw new IgnitionValidationError(
      `${eventOrFunctionCapitalized} "${name}" is not a valid overload of "${bareName}" in contract ${artifact.contractName}. Please use one of these names instead:

${normalizedNameList}`
    );
  }
}
