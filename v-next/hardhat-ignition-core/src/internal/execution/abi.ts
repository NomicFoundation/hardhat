import type {
  EvmTuple,
  EvmValue,
  FailedEvmExecutionResult,
  InvalidResultError,
  RevertWithCustomError,
  RevertWithInvalidData,
  RevertWithPanicCode,
  RevertWithReason,
  SuccessfulEvmExecutionResult,
} from "./types/evm-execution.js";
import type { TransactionReceipt } from "./types/jsonrpc.js";
import type { Artifact } from "../../types/artifact.js";
import type {
  ArgumentType,
  SolidityParameterType,
} from "../../types/module.js";
import type {
  EventFragment,
  Fragment,
  FunctionFragment,
  Interface,
  ParamType,
  Result,
} from "ethers";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ethers } from "ethers";

import { assertIgnitionInvariant } from "../utils/assertions.js";

import { linkLibraries } from "./libraries.js";
import { EvmExecutionResultTypes } from "./types/evm-execution.js";
import { equalAddresses } from "./utils/address.js";

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
 * Encodes the constructor arguments for a deployment.
 */
export function encodeDeploymentArguments(
  artifact: Artifact,
  args: SolidityParameterType[],
): string {
  const iface = new ethers.Interface(artifact.abi);

  const encodedArgs = iface.encodeDeploy(args);

  return encodedArgs.slice(2);
}

/**
 * Links the libraries in the artifact's deployment bytecode, encodes the constructor
 * arguments and returns the result, which can be used as the `data` field of a
 * deployment.
 */
export function encodeArtifactDeploymentData(
  artifact: Artifact,
  args: SolidityParameterType[],
  libraries: { [libraryName: string]: string },
): string {
  const linkedBytecode = linkLibraries(artifact, libraries);
  const encodedArgs = encodeDeploymentArguments(artifact, args);

  return linkedBytecode + encodedArgs;
}

/**
 * Encodes a function call for the given artifact and function name.
 */
export function encodeArtifactFunctionCall(
  artifact: Artifact,
  functionName: string,
  args: SolidityParameterType[],
): string {
  const validationErrors = validateArtifactFunctionName(artifact, functionName);

  if (validationErrors.length > 0) {
    throw validationErrors[0];
  }

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
  returnData: string,
): RevertWithCustomError | RevertWithInvalidData | undefined {
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
  returnData: string,
): InvalidResultError | SuccessfulEvmExecutionResult {
  const validationErrors = validateArtifactFunctionName(artifact, functionName);

  if (validationErrors.length > 0) {
    throw validationErrors[0];
  }

  const iface = ethers.Interface.from(artifact.abi);
  const functionFragment = getFunctionFragment(iface, functionName);

  try {
    const decoded = iface.decodeFunctionResult(functionFragment, returnData);
    const values = ethersResultIntoEvmTuple(decoded, functionFragment.outputs);

    return { type: EvmExecutionResultTypes.SUCCESSFUL_RESULT, values };
  } catch {
    return {
      type: EvmExecutionResultTypes.INVALID_RESULT_ERROR,
      data: returnData,
    };
  }
}

/**
 * Validate that the given args length matches the artifact's abi's args length.
 *
 * @param artifact - the artifact for the contract being validated
 * @param contractName - the name of the contract for error messages
 * @param args - the args to validate against
 */
export function validateContractConstructorArgsLength(
  artifact: Artifact,
  contractName: string,
  args: ArgumentType[],
): HardhatError[] {
  const errors: HardhatError[] = [];

  const argsLength = args.length;

  const iface = new ethers.Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    errors.push(
      new HardhatError(
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_CONSTRUCTOR_ARGS_LENGTH,
        {
          contractName,
          argsLength,
          expectedArgsLength,
        },
      ),
    );
  }

  return errors;
}

/**
 * Validates that a function is valid for the given artifact. That means:
 *  - It's a valid function name
 *    - The function name exists in the artifact's ABI
 *    - If the function is not overloaded, its bare name is used.
 *    - If the function is overloaded, the function name is includes the argument types
 *      in parentheses.
 * - The function has the correct number of arguments
 *
 * Optionally checks further static call constraints:
 * - The function is has a pure or view state mutability
 */
export function validateArtifactFunction(
  artifact: Artifact,
  contractName: string,
  functionName: string,
  args: ArgumentType[],
  isStaticCall: boolean,
): HardhatError[] {
  try {
    validateOverloadedName(artifact, functionName, false);
  } catch (e) {
    assertIgnitionInvariant(
      e instanceof HardhatError,
      "validateOverloadedName should only throw HardhatErrors",
    );

    return [e];
  }

  const errors: HardhatError[] = [];

  const iface = new ethers.Interface(artifact.abi);
  const fragment = getFunctionFragment(iface, functionName);

  // Check that the number of arguments is correct
  if (fragment.inputs.length !== args.length) {
    errors.push(
      new HardhatError(
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_FUNCTION_ARGS_LENGTH,
        {
          functionName,
          contractName,
          argsLength: args.length,
          expectedLength: fragment.inputs.length,
        },
      ),
    );
  }

  // Check that the function is pure or view, which is required for a static call
  if (isStaticCall && !fragment.constant) {
    errors.push(
      new HardhatError(
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_STATIC_CALL,
        {
          functionName,
          contractName,
        },
      ),
    );
  }

  return errors;
}

/**
 * Validates that a function name is valid for the given artifact. That means:
 *  - It's a valid function name
 *  - The function name exists in the artifact's ABI
 *  - If the function is not overloaded, its bare name is used.
 *  - If the function is overloaded, the function name is includes the argument types
 *    in parentheses.
 */
export function validateArtifactFunctionName(
  artifact: Artifact,
  functionName: string,
): HardhatError[] {
  try {
    validateOverloadedName(artifact, functionName, false);
  } catch (e) {
    assertIgnitionInvariant(
      e instanceof HardhatError,
      "validateOverloadedName should only throw HardhatError",
    );

    return [e];
  }

  return [];
}

/**
 * Validates that the event exists in the artifact, it's name is valid, handles overloads
 * correctly, and that the argument exists in the event.
 *
 * @param emitterArtifact The artifact of the contract emitting the event.
 * @param eventName The name of the event.
 * @param argument The argument name or index.
 */
export function validateArtifactEventArgumentParams(
  emitterArtifact: Artifact,
  eventName: string,
  argument: string | number,
): HardhatError[] {
  try {
    validateOverloadedName(emitterArtifact, eventName, true);
  } catch (e) {
    assertIgnitionInvariant(
      e instanceof HardhatError,
      "validateOverloadedName should only throw HardhatError",
    );

    return [e];
  }

  const iface = new ethers.Interface(emitterArtifact.abi);

  let eventFragment: EventFragment;
  try {
    eventFragment = getEventFragment(iface, eventName);
  } catch (e) {
    assertIgnitionInvariant(
      e instanceof HardhatError,
      "getEventFragment should only throw HardhatError",
    );

    return [e];
  }

  let paramType: ParamType;
  try {
    paramType = getEventArgumentParamType(
      emitterArtifact.contractName,
      eventName,
      eventFragment,
      argument,
    );
  } catch (e) {
    assertIgnitionInvariant(
      e instanceof HardhatError,
      "getEventArgumentParamType should only throw HardhatError",
    );

    return [e];
  }

  if (paramType.indexed === true) {
    // We can't access the value of indexed arguments with dynamic size
    // as their hash is stored in a topic, and its actual value isn't stored
    // anywhere
    if (hasDynamicSize(paramType)) {
      return [
        new HardhatError(
          HardhatError.ERRORS.IGNITION.VALIDATION.INDEXED_EVENT_ARG,
          {
            eventName,
            argument,
            contractName: emitterArtifact.contractName,
          },
        ),
      ];
    }
  }

  return [];
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
  nameOrIndex: string | number,
): EvmValue {
  const emitterLogs = receipt.logs.filter((l) =>
    equalAddresses(l.address, emitterAddress),
  );

  const iface = new ethers.Interface(emitterArtifact.abi);

  const eventFragment = getEventFragment(iface, eventName);
  const eventLogs = emitterLogs.filter(
    (l) => l.topics[0] === eventFragment.topicHash,
  );

  const log = eventLogs[eventIndex];

  const ethersResult = iface.decodeEventLog(
    eventFragment,
    log.data,
    log.topics,
  );

  const evmTuple = ethersResultIntoEvmTuple(ethersResult, eventFragment.inputs);

  if (typeof nameOrIndex === "string") {
    return evmTuple.named[nameOrIndex];
  }

  return evmTuple.positional[nameOrIndex];
}

/**
 * Decodes an error from a failed evm execution.
 *
 * @param returnData The data, as returned by the JSON-RPC.
 * @param customErrorReported A value indicating if the JSON-RPC error
 *  reported that it was due to a custom error.
 * @param decodeCustomError A function that decodes custom errors, returning
 *  `RevertWithCustomError` if successfully decoded, `RevertWithInvalidData`
 *  if a custom error was recognized but couldn't be decoded, and `undefined`
 *  it it wasn't recognized.
 * @returns A `FailedEvmExecutionResult` with the decoded error.
 */
export function decodeError(
  returnData: string,
  customErrorReported: boolean,
  decodeCustomError?: (
    returnData: string,
  ) => RevertWithCustomError | RevertWithInvalidData | undefined,
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
  returnData: string,
): RevertWithReason | RevertWithInvalidData | undefined {
  if (!returnData.startsWith(REVERT_REASON_SIGNATURE)) {
    return undefined;
  }

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  try {
    const [reason] = abiCoder.decode(
      ["string"],
      Buffer.from(returnData.slice(REVERT_REASON_SIGNATURE.length), "hex"),
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
  returnData: string,
): RevertWithPanicCode | RevertWithInvalidData | undefined {
  if (!returnData.startsWith(PANIC_CODE_SIGNATURE)) {
    return undefined;
  }

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  try {
    const decoded = abiCoder.decode(
      ["uint256"],
      Buffer.from(returnData.slice(REVERT_REASON_SIGNATURE.length), "hex"),
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
  paramType: ParamType,
): EvmValue {
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
        `[ethers.js values decoding] arrayChildren must be defined for array ${paramType.type}`,
      );

      return ethersResultIntoEvmValueArray(
        ethersValue,
        paramType.arrayChildren,
      );
    }

    assertIgnitionInvariant(
      paramType.components !== null,
      `[ethers.js values decoding] components must be defined for tuple ${paramType.type}`,
    );

    return ethersResultIntoEvmTuple(ethersValue, paramType.components);
  }

  throw new HardhatError(
    HardhatError.ERRORS.IGNITION.GENERAL.UNSUPPORTED_DECODE,
    {
      type: paramType.type,
      value: JSON.stringify(ethersValue, undefined, 2),
    },
  );
}

function ethersResultIntoEvmValueArray(
  result: Result,
  elementParamType: ParamType,
): EvmValue[] {
  return Array.from(result).map((ethersValue) =>
    ethersValueIntoEvmValue(ethersValue, elementParamType),
  );
}

function ethersResultIntoEvmTuple(
  result: Result,
  paramsParamType: readonly ParamType[],
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
  functionName: string,
): FunctionFragment {
  const fragment = iface.fragments
    .filter(ethers.Fragment.isFunction)
    .find(
      (fr) =>
        fr.name === functionName ||
        getFunctionNameWithParams(fr) === functionName,
    );

  assertIgnitionInvariant(
    fragment !== undefined,
    "Called getFunctionFragment with an invalid function name",
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
  // TODO: Add support for event overloading
  const fragment = iface.fragments
    .filter(ethers.Fragment.isEvent)
    .find(
      (fr) => fr.name === eventName || getEventNameWithParams(fr) === eventName,
    );

  assertIgnitionInvariant(
    fragment !== undefined,
    "Called getEventFragment with an invalid event name",
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
  isEvent: boolean,
): void {
  const eventOrFunction = isEvent ? "event" : "function";
  const eventOrFunctionCapitalized = isEvent ? "Event" : "Function";

  const bareName = getBareName(name);

  if (bareName === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_OVERLOAD_NAME,
      {
        eventOrFunction,
        name,
      },
    );
  }

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
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.VALIDATION.OVERLOAD_NOT_FOUND,
      {
        name,
        eventOrFunction: eventOrFunctionCapitalized,
        contractName: artifact.contractName,
      },
    );
  } else if (fragments.length === 1) {
    // If it is not overloaded we force the user to use the bare name
    // because having a single representation is more friendly with our reconciliation
    // process.
    if (bareName !== name) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.VALIDATION.REQUIRE_BARE_NAME,
        {
          name,
          bareName,
          eventOrFunction: eventOrFunctionCapitalized,
          contractName: artifact.contractName,
        },
      );
    }
  } else {
    // If it's overloaded, we force the user to use the full name
    const normalizedNames = fragments.map((f) => {
      if (ethers.Fragment.isEvent(f)) {
        return getEventNameWithParams(f);
      }

      return getFunctionNameWithParams(f);
    });

    const normalizedNameList = normalizedNames
      .map((nn) => `* ${nn}`)
      .join("\n");

    if (bareName === name) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.VALIDATION.OVERLOAD_NAME_REQUIRED,
        {
          name,
          normalizedNameList,
          eventOrFunction: eventOrFunctionCapitalized,
          contractName: artifact.contractName,
        },
      );
    }

    if (!normalizedNames.includes(name)) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_OVERLOAD_GIVEN,
        {
          name,
          bareName,
          normalizedNameList,
          eventOrFunction: eventOrFunctionCapitalized,
          contractName: artifact.contractName,
        },
      );
    }
  }
}

/**
 * Returns teh param type of an event argument, throwing a validation error if it's not found.
 * @param eventFragment
 * @param argument
 */
function getEventArgumentParamType(
  contractName: string,
  eventName: string,
  eventFragment: EventFragment,
  argument: string | number,
): ParamType {
  if (typeof argument === "string") {
    for (const input of eventFragment.inputs) {
      if (input.name === argument) {
        return input;
      }
    }

    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.VALIDATION.EVENT_ARG_NOT_FOUND,
      {
        eventName,
        argument,
        contractName,
      },
    );
  }

  const paramType = eventFragment.inputs[argument];

  if (paramType === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_EVENT_ARG_INDEX,
      {
        eventName,
        argument,
        contractName,
        expectedLength: eventFragment.inputs.length,
      },
    );
  }

  return paramType;
}

/**
 * Validates the param type of a static call return value, throwing a validation error if it's not found.
 */
export function validateFunctionArgumentParamType(
  contractName: string,
  functionName: string,
  artifact: Artifact,
  argument: string | number,
): HardhatError[] {
  const iface = new ethers.Interface(artifact.abi);
  let functionFragment: FunctionFragment;
  try {
    functionFragment = getFunctionFragment(iface, functionName);
  } catch (e) {
    assertIgnitionInvariant(
      e instanceof HardhatError,
      "getFunctionFragment should only throw HardhatError",
    );
    return [e];
  }

  if (typeof argument === "string") {
    let hasArg = false;
    for (const output of functionFragment.outputs) {
      if (output.name === argument) {
        hasArg = true;
      }
    }

    if (!hasArg) {
      return [
        new HardhatError(
          HardhatError.ERRORS.IGNITION.VALIDATION.FUNCTION_ARG_NOT_FOUND,
          {
            functionName,
            argument,
            contractName,
          },
        ),
      ];
    }
  } else {
    const paramType = functionFragment.outputs[argument];

    if (paramType === undefined) {
      return [
        new HardhatError(
          HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_FUNCTION_ARG_INDEX,
          {
            functionName,
            argument,
            contractName,
            expectedLength: functionFragment.outputs.length,
          },
        ),
      ];
    }
  }

  return [];
}

/**
 * Returns true if the given param type has a dynamic size.
 */
function hasDynamicSize(paramType: ParamType): boolean {
  return (
    paramType.isArray() ||
    paramType.isTuple() ||
    paramType.type === "bytes" ||
    paramType.type === "string"
  );
}
