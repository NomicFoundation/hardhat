import type { NewUtilsTaskActionFunction } from "../../types.js";

import { parseIntType } from "./int-type.js";

interface MinValueActionArguments {
  type: string;
}

const minValueAction: NewUtilsTaskActionFunction<
  MinValueActionArguments
> = async ({ type }) => {
  const { signed, bits } = parseIntType(type);

  const min = signed ? -(2n ** BigInt(bits - 1)) : 0n;

  console.log(min.toString());
};

export default minValueAction;
