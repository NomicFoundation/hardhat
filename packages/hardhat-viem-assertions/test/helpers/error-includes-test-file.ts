import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";

const projectRootPath = path.normalize(
  path.join(fileURLToPath(import.meta.url), "../../../"),
);

export function errorIncludesTestFile(
  error: unknown,
  testAbsolutePath: string,
): boolean {
  ensureError(error);
  const relativeTestPath = path.relative(projectRootPath, testAbsolutePath);

  let cause: any = error;
  while (cause !== undefined) {
    if (cause.stack.includes(relativeTestPath) === true) {
      return true;
    }

    cause = cause.cause;
  }

  return false;
}
