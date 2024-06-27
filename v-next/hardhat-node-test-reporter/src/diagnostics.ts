import type { TestEventData } from "./types.js";

export interface GlobalDiagnostics {
  tests: number;
  suites: number;
  pass: number;
  fail: number;
  cancelled: number;
  skipped: number;
  todo: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- keeping this alingned with the node:test event
  duration_ms: number;
}

/**
 * This function receives all the diagnostics that have been emitted by the test
 * run, and tries to parse a set of well-known global diagnostics that node:test
 * emits to report the overall status of the test run.
 *
 * If the diagnostics are not recognized, or can't be parsed effectively, they
 * are returned as `unsedDiagnostics`, so that we can print them at the end.
 */
export function processGlobalDiagnostics(
  diagnostics: Array<TestEventData["test:diagnostic"]>,
): {
  globalDiagnostics: GlobalDiagnostics;
  unusedDiagnostics: Array<TestEventData["test:diagnostic"]>;
} {
  const globalDiagnostics: GlobalDiagnostics = {
    tests: 0,
    suites: 0,
    pass: 0,
    fail: 0,
    cancelled: 0,
    skipped: 0,
    todo: 0,
    duration_ms: 0,
  };

  const unusedDiagnostics = [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.nesting !== 0) {
      unusedDiagnostics.push(diagnostic);
      continue;
    }

    const [name, numberString] = diagnostic.message.split(" ");
    if (!(name in globalDiagnostics) || numberString === undefined) {
      unusedDiagnostics.push(diagnostic);
      continue;
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We checked that thsi is a key of globalDiagnostics */
    const nameAsKey = name as keyof GlobalDiagnostics;

    try {
      const value = parseFloat(numberString);

      globalDiagnostics[nameAsKey] = value;
    } catch {
      // If this throwed, the format of the diagnostic isn't what we expected,
      // so we just print it as an unused diagnostic.
      unusedDiagnostics.push(diagnostic);
    }
  }

  return { globalDiagnostics, unusedDiagnostics };
}
