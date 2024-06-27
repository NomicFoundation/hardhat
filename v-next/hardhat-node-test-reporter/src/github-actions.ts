import type { TestEventData } from "./types.js";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatError } from "./error-formatting.js";
import { cleanupTestFailError } from "./node-test-error-utils.js";

export async function annotatePR(
  event: TestEventData["test:fail"],
): Promise<void> {
  if (
    process.env.GITHUB_ACTIONS === undefined ||
    process.env.NO_GITHUB_ACTIONS_ANNOTATIONS !== undefined
  ) {
    return;
  }

  const error = event.details.error;

  const location = getLocation(error);
  if (location === undefined) {
    return;
  }

  const { default: core } = await import("@actions/core");

  core.error(formatError(error), {
    file: location.file,
    startLine: location.line,
    startColumn: location.column,
    title: event.name,
  });
}

function getLocation(
  error: Error,
): { file: string; line: number; column: number } | undefined {
  error = cleanupTestFailError(error);

  const match = error.stack?.match(/at .* \((.*):(\d+):(\d+)\)/);
  if (match === null || match === undefined) {
    return;
  }

  const [, file, line, column] = match;

  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

  const filePath = file.startsWith("file://") ? fileURLToPath(file) : file;

  // The error doesn't come from the workspace
  if (filePath.startsWith(workspace) === false) {
    return undefined;
  }

  const relativePath = path.relative(workspace, filePath);

  return {
    file: relativePath,
    line: +line,
    column: +column,
  };
}
