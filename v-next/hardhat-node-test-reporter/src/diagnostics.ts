import { TestEventData } from "./types.js";

export interface GlobalDiagnostics {
  tests: number;
  suites: number;
  pass: number;
  fail: number;
  cancelled: number;
  skipped: number;
  todo: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  duration_ms: number;
}

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

    try {
      const value = parseFloat(numberString);
      globalDiagnostics[name as keyof GlobalDiagnostics] = value;
    } catch {
      unusedDiagnostics.push(diagnostic);
    }
  }

  return { globalDiagnostics, unusedDiagnostics };
}
