import type { NewUtilsTaskActionFunction } from "../../types.js";

import { parseIntType } from "./int-type.js";

interface MaxValueActionArguments {
  type: string;
}

const maxValueAction: NewUtilsTaskActionFunction<
  MaxValueActionArguments
> = async ({ type }) => {
  const { signed, bits } = parseIntType(type);

  const max = 2n ** BigInt(signed ? bits - 1 : bits) - 1n;

  console.log(max.toString());
};

export default maxValueAction;
