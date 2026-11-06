import type { NewUtilsTaskActionFunction } from "../../types.js";

import { parseUnits } from "./units.js";

interface ParseUnitsActionArguments {
  value: string;
  decimals: number;
}

const parseUnitsAction: NewUtilsTaskActionFunction<
  ParseUnitsActionArguments
> = async ({ value, decimals }) => {
  console.log(parseUnits(value, decimals).toString());
};

export default parseUnitsAction;
