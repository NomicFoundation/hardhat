import type { GlobalDiagnostics } from "./diagnostics.js";
import type { TestEventData } from "./types.js";

import { styleText } from "node:util";

import { formatError } from "./error-formatting.js";

export const INFO_SYMBOL: string = styleText("blue", "\u2139");
export const SUCCESS_SYMBOL: string = styleText("green", "✔");

export interface Failure {
  index: number;
  testFail: TestEventData["test:fail"];
  contextStack: Array<TestEventData["test:start"]>;
}

export function formatTestContext(
  contextStack: Array<TestEventData["test:start"]>,
  prefix = "",
  suffix = "",
  isSkipped = false,
): string {
  const contextFragments: string[] = [];

  const prefixLength = prefix.length;

  for (const [i, parentTest] of contextStack.entries()) {
    const indentation = nestingToIndentationLength(parentTest.nesting);

    if (i === 0) {
      contextFragments.push(indent(prefix, indentation));
    } else {
      contextFragments.push("\n");
      contextFragments.push(indent("", indentation + prefixLength));
    }

    if (isSkipped && i === contextStack.length - 1) {
      contextFragments.push(styleText("cyan", `- ${parentTest.name}`));
    } else {
      contextFragments.push(parentTest.name);
    }
  }

  contextFragments.push(suffix);

  return contextFragments.join("");
}

export function formatTestPass(passData: TestEventData["test:pass"]): string {
  let msg: string;

  if (passData.skip === true || typeof passData.skip === "string") {
    // TODO: show skip reason
    msg = styleText("cyan", `- ${passData.name}`);
  } else if (passData.todo === true || typeof passData.todo === "string") {
    // TODO: show todo reason
    msg = styleText("blue", `+ ${passData.name}`);
  } else {
    msg = SUCCESS_SYMBOL + styleText("gray", ` ${passData.name}`);
  }

  return indent(msg, nestingToIndentationLength(passData.nesting));
}

export function formatTestCancelledByParentFailure(failure: Failure): string {
  return indent(
    styleText("grey",
      `${formatFailureIndex(failure.index)}) ${failure.testFail.name}`,
    ),
    nestingToIndentationLength(failure.testFail.nesting),
  );
}

export function formatTestFailure(failure: Failure): string {
  return indent(
    styleText("red", `${formatFailureIndex(failure.index)}) ${failure.testFail.name}`),
    nestingToIndentationLength(failure.testFail.nesting),
  );
}

export function formatFailureReason(failure: Failure): string {
  return `${formatTestContext(
    failure.contextStack,
    `${formatFailureIndex(failure.index)}) `,
    ":",
  )}

${indent(formatError(failure.testFail.details.error), 3)}`;
}

export function formatSlowTestInfo(durationMs: number): string {
  return ` ${styleText(["red", "italic"], `(${Math.floor(durationMs)}ms)`)}`;
}

export function formatGlobalDiagnostics(
  diagnostics: GlobalDiagnostics,
): string {
  let result = "  ";

  result +=
    styleText("green", `${diagnostics.pass} passing`) +
    styleText("gray", ` (${Math.floor(diagnostics.duration_ms)}ms)`);

  if (diagnostics.fail > 0) {
    result += "\n" + styleText("red", `  ${diagnostics.fail} failing`);
  }

  if (diagnostics.skipped > 0) {
    result += "\n" + styleText("cyan", `  ${diagnostics.skipped} skipped`);
  }

  if (diagnostics.todo > 0) {
    result += "\n" + styleText("blue", `  ${diagnostics.todo} todo`);
  }

  if (diagnostics.cancelled > 0) {
    result += "\n" + styleText("gray", `  ${diagnostics.cancelled} cancelled`);
  }

  return result;
}

function isTestOnlyMessage(message: string): boolean {
  return message.includes("--test-only");
}

export function formatUnusedDiagnostics(
  unusedDiagnostics: Array<TestEventData["test:diagnostic"]>,
  testOnlyMessage?: string,
): string {
  const messages = unusedDiagnostics
    .map(({ message }) => {
      if (isTestOnlyMessage(message)) {
        return testOnlyMessage ?? message;
      }
      return message;
    })
    .map((message) => `  ${INFO_SYMBOL} ${message}`);
  return Array.from(new Set(messages)).join("\n");
}

function formatFailureIndex(index: number): string {
  return index.toString();
}

function nestingToIndentationLength(nesting: number): number {
  return (nesting + 1) * 2;
}

export function indent(str: string, spaces: number): string {
  const padding = " ".repeat(spaces);
  return str.replace(/^/gm, padding);
}
