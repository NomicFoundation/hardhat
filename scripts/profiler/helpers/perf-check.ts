import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { perfRecordArgs } from "./perf-record.ts";

/** Whether a tool is available on the PATH. */
export function toolAvailable(tool: string): boolean {
  return spawnSync("which", [tool], { stdio: "ignore" }).status === 0;
}

/**
 * Verifies that `perf record` actually works in this environment before
 * spending minutes on a profiled run. Throws with actionable guidance when
 * perf is missing or recording is blocked (kernel.perf_event_paranoid,
 * container seccomp policy).
 */
export function ensurePerfRecordWorks(): void {
  if (!toolAvailable("perf")) {
    throw new Error(
      "`perf` is not on the PATH. Install it first, e.g. " +
        "`sudo apt-get install linux-perf` (Debian/WSL) or " +
        "`sudo apt-get install linux-tools-generic` (Ubuntu).",
    );
  }

  const tmpDir = mkdtempSync(path.join(tmpdir(), "perf-selftest-"));
  const perfData = path.join(tmpDir, "perf.data");

  try {
    const result = spawnSync(
      "perf",
      [...perfRecordArgs(perfData, 99), "--", "true"],
      { encoding: "utf-8" },
    );

    if (result.status !== 0) {
      throw new Error(
        "`perf record` is blocked in this environment:\n" +
          `${result.stderr.trim()}\n` +
          "Likely causes: kernel.perf_event_paranoid disallows sampling, or " +
          "a container seccomp policy denies perf_event_open. Try " +
          "`sudo sysctl kernel.perf_event_paranoid=1`, or see the EDR " +
          "book's profiling chapter (Permissions appendix) for fixes.",
      );
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
