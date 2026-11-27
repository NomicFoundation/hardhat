import type { NewUtilsTaskActionFunction } from "../../types.js";

import { getUnitDecimals, parseUnits } from "./units.js";

interface ToWeiActionArguments {
  value: string;
  unit: string;
}

const toWeiAction: NewUtilsTaskActionFunction<ToWeiActionArguments> = async ({
  value,
  unit,
}) => {
  console.log(parseUnits(value, getUnitDecimals(unit)).toString());
};

export default toWeiAction;
