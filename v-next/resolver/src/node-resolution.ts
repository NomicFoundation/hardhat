import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export enum ResolutionError {
  /**
   * The node resolution failed to find the module and/or package.
   */
  MODULE_NOT_FOUND = "MODULE_NOT_FOUND",

  /**
   * The node resolution found the package, but it uses package.json#exports
   * and doesn't export the requested module.
   */
  NOT_EXPORTED = "NOT_EXPORTED",
}

export type ResolutionResult = { absolutePath: string } | ResolutionError;

export function resolve({
  toResolve,
  from,
}: {
  toResolve: string;
  from: string;
}): ResolutionResult {
  try {
    return { absolutePath: require.resolve(toResolve, { paths: [from] }) };
  } catch (e) {
    // ensure that this is MODULE_NOT_FOUND
    if (typeof e === "object" && e !== null && "code" in e) {
      if (e.code === "MODULE_NOT_FOUND") {
        return ResolutionError.MODULE_NOT_FOUND;
      }

      if (e.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        return ResolutionError.NOT_EXPORTED;
      }
    }

    /* c8 ignore next 2 */
    throw e;
  }
}
