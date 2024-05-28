import chalk from "chalk";

import { GlobalDiagnostics } from "./diagnostics.js";
import { formatError } from "./error-formatting.js";
import { Failure, TestEventData } from "./types.js";

export const INFO_SYMBOL = chalk.blue("\u2139");
export const SUCCESS_SYMBOL = chalk.green("✔");

export function* formatTestContext(
  contextStack: Array<TestEventData["test:start"]>,
  prefix = "",
  suffix = "",
) {
  const prefixLength = prefix.length;

  for (const [i, parentTest] of contextStack.entries()) {
    if (i !== 0) {
      yield "\n";
    }

    yield "".padEnd(
      (parentTest.nesting + 1) * 2 + (i !== 0 ? prefixLength : 0),
    );

    if (i === 0 && prefix !== "") {
      yield prefix;
    }

    yield parentTest.name;
  }
  yield suffix + "\n";
}

export function* formatTestPass(
  passData: TestEventData["test:pass"],
): Generator<string> {
  yield "".padEnd((passData.nesting + 1) * 2);

  if (passData.skip === true || typeof passData.skip === "string") {
    // TODO: show skip reason
    yield chalk.cyan(`- ${passData.name}`);
  } else if (passData.todo === true || typeof passData.todo === "string") {
    // TODO: show todo reason
    yield chalk.blue(`+ ${passData.name}`);
  } else {
    const successMsg = `${SUCCESS_SYMBOL} ${passData.name}`;
    yield chalk.gray(successMsg);
  }
}

export function* formatTestFailure(failure: Failure): Generator<string> {
  yield "".padEnd((failure.testFail.nesting + 1) * 2);

  const failMsg = `${formatFailureIndex(failure.index)}) ${failure.testFail.name}`;

  yield chalk.red(failMsg);
}

export function* formatFailureReason(failure: Failure): Generator<string> {
  yield* formatTestContext(
    failure.contextStack,
    `${formatFailureIndex(failure.index)}) `,
    ":",
  );
  yield "\n";
  yield indent(formatError(failure.testFail.details.error), 3);
}

export function* formatSlowTestInfo(durationMs: number): Generator<string> {
  const durationMsg = chalk.italic(`(${Math.floor(durationMs)}ms)`);

  yield " ";
  yield chalk.red(durationMsg);
}

export function formatGlobalDiagnostics(
  diagnostics: GlobalDiagnostics,
): string {
  let result =
    chalk.green(`${diagnostics.pass} passing`) +
    chalk.gray(` (${Math.floor(diagnostics.duration_ms)}ms)`);

  if (diagnostics.fail > 0) {
    result += chalk.red(`
${diagnostics.fail} failing`);
  }

  if (diagnostics.skipped > 0) {
    result += chalk.cyan(`
${diagnostics.skipped} skipped`);
  }

  if (diagnostics.todo > 0) {
    result += chalk.blue(`
${diagnostics.todo} todo`);
  }

  if (diagnostics.cancelled > 0) {
    result += chalk.gray(`
${diagnostics.cancelled} cancelled`);
  }

  return result;
}

export function formatUnusedDiagnostics(
  unusedDiagnostics: Array<TestEventData["test:diagnostic"]>,
): string {
  return unusedDiagnostics
    .map(({ message }) => `${INFO_SYMBOL} ${message}`)
    .join("\n");
}

function formatFailureIndex(index: number): string {
  return (index + 1).toString();
}

function indent(str: string, spaces: number): string {
  const padding = " ".repeat(spaces);
  return str.replace(/^/gm, padding);
}
