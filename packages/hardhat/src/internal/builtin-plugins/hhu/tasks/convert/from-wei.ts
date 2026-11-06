import type { NewUtilsTaskActionFunction } from "../../types.js";

import { formatUnits, getUnitDecimals } from "./units.js";

interface FromWeiActionArguments {
  value: bigint;
  unit: string;
}

const fromWeiAction: NewUtilsTaskActionFunction<
  FromWeiActionArguments
> = async ({ value, unit }) => {
  console.log(formatUnits(value, getUnitDecimals(unit)));
};

export default fromWeiAction;
