import type { GenericFunction } from "../../../types.js";

import { handleRevert } from "./core.js";

export async function revert(fn: GenericFunction): Promise<void> {
  await handleRevert(fn);
}
