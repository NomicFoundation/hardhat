import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

// TODO: we should consider moving this to hardhat-utils
/**
 * Dynamically imports a module from a filesystem path.
 *
 * Resolves `modulePath` against the current working directory and attempts
 * to load it via ESM `import()`. Errors are wrapped in `HardhatError` with
 * specific codes for not found, syntax errors, or other import failures.
 *
 * @param modulePath The user-provided path to the module (relative or absolute).
 * @returns A promise that resolves to the module namespace object.
 * @throws {HardhatError}
 *   - ERR_MODULE_NOT_FOUND if the module file doesn’t exist
 *   - ERR_MODULE_SYNTAX_ERROR if there’s a parse/syntax error in the module
 *   - ERR_IMPORT_MODULE_FAILED for any other import/runtime error
 */
export async function loadModule(
  modulePath: string,
): Promise<Record<string, unknown>> {
  const moduleAbsolutePath = path.resolve(process.cwd(), modulePath);

  try {
    // TODO: check that this works in windows
    const importedModule: Record<string, unknown> = await import(
      moduleAbsolutePath
    );

    return importedModule;
  } catch (error) {
    ensureError(error);

    if ("code" in error && error.code === "ERR_MODULE_NOT_FOUND") {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.MODULE_NOT_FOUND,
        { modulePath },
      );
    }

    if (error instanceof SyntaxError) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.MODULE_SYNTAX_ERROR,
        { modulePath, errorMessage: error.message },
      );
    }

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.IMPORT_MODULE_FAILED,
      { modulePath, errorMessage: error.message },
    );
  }
}
