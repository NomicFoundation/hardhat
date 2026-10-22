import type { NewUtilsTaskActionFunction } from "../../types.js";

import { encodeArguments } from "./encode.js";
import { parseSignature } from "./signature.js";

interface EncodeArgsActionArguments {
  signature: string;
  values: string[];
}

const encodeArgsAction: NewUtilsTaskActionFunction<
  EncodeArgsActionArguments
> = async ({ signature, values }) => {
  const { inputs } = parseSignature(signature);

  console.log(await encodeArguments(inputs, values, "values"));
};

export default encodeArgsAction;
