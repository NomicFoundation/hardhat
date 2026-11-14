import type { NewUtilsTaskActionFunction } from "../../types.js";

import { formatUnits } from "./units.js";

interface FormatUnitsActionArguments {
  value: bigint;
  decimals: number;
}

const formatUnitsAction: NewUtilsTaskActionFunction<
  FormatUnitsActionArguments
> = async ({ value, decimals }) => {
  console.log(formatUnits(value, decimals));
};

export default formatUnitsAction;
