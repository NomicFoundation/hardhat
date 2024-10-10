import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";

export function requireNapiRsModule(id: string): unknown {
  try {
    return require(id);
  } catch (e) {
    ensureError(e);

    // TODO: I can't find the Error I should ensureError assert on, I have the
    // interface NodeJS.ErrnoException.
    if ("code" in e && e.code === "MODULE_NOT_FOUND") {
      throw new HardhatError(HardhatError.ERRORS.GENERAL.CORRUPTED_LOCKFILE);
    }

    throw e;
  }
}
