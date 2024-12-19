import isArray from "lodash/isArray";

import { SolidityParameterType } from "../../../types/module";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { EvmTuple, EvmValue } from "../types/evm-execution";

export function convertEvmValueToSolidityParam(
  evmValue: EvmValue
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
  evmTuple: EvmTuple
): SolidityParameterType[] {
  const converted = convertEvmValueToSolidityParam(evmTuple);

  assertIgnitionInvariant(
    Array.isArray(converted),
    "Failed to convert an EvmTuple to SolidityParameterType[]"
  );

  return converted;
}
