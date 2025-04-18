import type { GenericFunction } from "../../../types.js";

import { checkRevert } from "./utils.js";

export async function revert(fn: GenericFunction): Promise<void> {
  await checkRevert(fn);
}
