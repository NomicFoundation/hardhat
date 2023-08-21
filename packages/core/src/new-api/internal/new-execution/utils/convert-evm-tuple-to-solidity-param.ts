import isArray from "lodash/isArray";

import { SolidityParameterType } from "../../../types/module";
import { EvmTuple, EvmValue } from "../types/evm-execution";

export function convertEvmTupleToSolidityParam(
  evmTuple: EvmTuple
): SolidityParameterType {
  return _convertEvmType(evmTuple);
}

function _convertEvmType(evmValue: EvmValue): SolidityParameterType {
  if (typeof evmValue === "object" && "positional" in evmValue) {
    return evmValue.positional.map(_convertEvmType);
  } else if (isArray(evmValue)) {
    return evmValue.map(_convertEvmType);
  } else {
    return evmValue;
  }
}
