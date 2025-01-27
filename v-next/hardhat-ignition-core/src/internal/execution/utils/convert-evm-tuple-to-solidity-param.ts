import type { SolidityParameterType } from "../../../types/module.js";
import type { EvmTuple, EvmValue } from "../types/evm-execution.js";

import isArray from "lodash/isArray";

import { assertIgnitionInvariant } from "../../utils/assertions.js";

export function convertEvmValueToSolidityParam(
  evmValue: EvmValue,
): SolidityParameterType {
  if (isArray(evmValue)) {
    return evmValue.map(convertEvmValueToSolidityParam);
  }

  if (typeof evmValue === "object") {
    return evmValue.positional.map(convertEvmValueToSolidityParam);
  }

  return evmValue;
}

export function convertEvmTupleToSolidityParam(
  evmTuple: EvmTuple,
): SolidityParameterType[] {
  const converted = convertEvmValueToSolidityParam(evmTuple);

  assertIgnitionInvariant(
    Array.isArray(converted),
    "Failed to convert an EvmTuple to SolidityParameterType[]",
  );

  return converted;
}
